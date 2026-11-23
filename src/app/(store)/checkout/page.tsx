import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm, PendingOrderPanel } from "@/components/checkout/CheckoutForm";
import { CountrySelect } from "@/components/checkout/CountrySelect";
import { ProductImage } from "@/components/shop/ProductImage";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/Notice";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { formatMoney, toCurrency } from "@/domain/money";
import { COUNTRY_ONLY_MESSAGE, CR_PROVINCES, STORE_COUNTRY, countryName, parseDestination } from "@/domain/shipping";
import { formatBps } from "@/domain/tax";
import { cn } from "@/lib/utils";
import { getSession } from "@/server/auth";
import { isPaymentsEnabled } from "@/server/payments/tilopay/config";
import { getPendingOrderForCart } from "@/server/services/checkout/place-order";
import { calculateCheckoutTotals } from "@/server/services/checkout/totals";
import { settleExpiredOrders } from "@/server/services/payments/reconcile";
import { getCartOwner } from "@/server/services/cart/identity";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false, follow: false } };
// Todo se recalcula en el servidor en cada visita (precios, impuesto, tarifas y stock vigentes).
export const dynamic = "force-dynamic";

const input = "w-full rounded-xl border-2 border-celeste bg-paper px-3 py-2.5 text-ink focus:border-aqua focus:outline-none";
const row = "flex items-baseline justify-between gap-4";

/**
 * CHECKOUT: resumen de la compra.
 *  - Se envía a Costa Rica (todo) y a América (solo merch, con tarifa por país). Hay selector de país; el servidor RECHAZA cualquier otro.
 *  - La URL solo trae el destino (provincia, ciudad, código postal). Nunca montos: el subtotal, el impuesto, el envío
 *    y el total salen de `calculateCheckoutTotals`, que lo lee todo de PostgreSQL.
 *  - En Costa Rica el método es "Envío nacional"; en el exterior, "Envío internacional" con la tarifa de ese país. La logística real es manual.
 *  - Con el envío resuelto, aparece el formulario de datos y "Pagar con tarjeta": el servidor crea el pedido pendiente (reservando el
 *    stock) y redirige a la página de pago de Tilopay. Aquí NO hay campos de tarjeta.
 */
export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ pais?: string; provincia?: string; ciudad?: string; cp?: string; entrega?: string }> }) {
  if (!isDatabaseConfigured()) {
    return <ComingSoon title="Finalizar compra" description="El proceso de compra todavía no está disponible." back={{ label: "Volver al carrito", href: routes.cart }} />;
  }
  const params = await searchParams;
  const { destination, countryRejected } = parseDestination(params);
  const owner = await getCartOwner();
  // Antes de calcular disponibilidad: las reservas VENCIDAS (30 min) se verifican con Tilopay y, si no se pagaron, devuelven su stock.
  // Sin freno: quien está comprando ve la disponibilidad real (verificada con Tilopay) al instante.
  if (isPaymentsEnabled()) await settleExpiredOrders(getDb(), { limit: 5, source: "expiry" }).catch(() => undefined);
  const { totals, cart } = await calculateCheckoutTotals(getDb(), { owner, destination, shippingMethodId: null, choice: params.entrega === "retiro" ? "PICKUP" : "DELIVERY" });
  // Un carrito con un pedido pendiente de pago lo retoma o lo cancela; no se crean pedidos duplicados.
  const pending = owner ? await getPendingOrderForCart(getDb(), owner) : null;
  const session = await getSession();
  const paymentsEnabled = isPaymentsEnabled();
  const currency = toCurrency(totals.currency);
  const money = (amount: number) => formatMoney(amount, currency);

  if (cart.lines.length === 0) {
    return (
      <section className="bg-gradient-to-b from-celeste/40 to-paper py-20">
        <Container size="narrow" className="text-center">
          <h1 className="text-4xl font-bold">Tu carrito está vacío.</h1>
          <p className="mt-3 text-ink/75">Agregá algo para poder finalizar tu compra.</p>
          <Link href={routes.shop} className="mt-8 inline-flex min-h-12 items-center rounded-full bg-navy px-8 py-3 font-display font-bold text-paper hover:bg-ink">Explorar la tienda</Link>
        </Container>
      </section>
    );
  }

  const { shipping, tax } = totals;
  const method = shipping.method;
  // Un país distinto de Costa Rica (request manipulada) NUNCA recibe envío: se le explica en vez de pedirle la dirección de nuevo.
  const countryProblem = countryRejected || shipping.state === "unsupported_country";
  // "Envío internacional": se elige con su tarjeta (entrega=internacional) o con un país de América en la URL; sin país, se pide elegirlo.
  const intlMode = !countryRejected && (params.entrega === "internacional" || (destination !== null && destination.country !== STORE_COUNTRY));
  const country = destination?.country ?? (intlMode ? "" : STORE_COUNTRY);
  const abroad = country !== STORE_COUNTRY;
  const restricted = shipping.state === "domestic_only";
  // Pedido solo digital: sin envío (₡0) ni dirección de entrega. Solo se pide una dirección de FACTURACIÓN (la pasarela la exige).
  const digitalOnly = !shipping.required && cart.lines.length > 0;
  const hasDigital = cart.lines.some((line) => line.fulfillment === "DIGITAL");
  // Retiro en persona: no hay dirección de entrega ni envío; se pide solo la dirección de FACTURACIÓN (la pasarela la exige).
  const pickupChosen = shipping.required && shipping.choice === "PICKUP" && shipping.selected?.type === "PICKUP";
  const deliveryParams = new URLSearchParams();
  if (!abroad) for (const key of ["provincia", "ciudad", "cp"] as const) if (params[key]) deliveryParams.set(key, params[key]);
  const deliveryHref = deliveryParams.size > 0 ? `${routes.checkout}?${deliveryParams}` : routes.checkout;
  const pickupHref = `${routes.checkout}?entrega=retiro`;
  const intlHref = `${routes.checkout}?entrega=internacional`;
  const intlChosen = intlMode && !pickupChosen;

  return (
    <section className="bg-paper py-10 sm:py-14">
      <Container>
        <Link href={routes.cart} className="text-sm font-semibold text-navy underline underline-offset-4">← Volver al carrito</Link>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Finalizar compra</h1>

        {totals.blockers.length > 0 && (
          <Notice tone="warning" className="mt-6">
            <p className="font-bold">Tenés que revisar tu carrito antes de continuar:</p>
            <ul className="mt-1 list-disc pl-5">{totals.blockers.map((b, i) => <li key={i}>{b.message}</li>)}</ul>
            <Link href={routes.cart} className="mt-2 inline-block font-semibold underline underline-offset-4">Ir al carrito</Link>
          </Notice>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
          <div className="space-y-6">
          {digitalOnly ? (
            <div className="rounded-3xl border border-celeste p-5 sm:p-6">
              <h2 className="font-display text-xl font-bold text-navy">Entrega digital</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/75">Tu compra es 100% digital: no hay envío ni costo de envío. Cuando el pago se confirme vas a poder descargar tu PDF desde la página de tu pedido y te lo enviamos también por correo.</p>
            </div>
          ) : (
          <>
          {(shipping.pickup || shipping.required) && (
            <fieldset className="rounded-3xl border border-celeste p-5 sm:p-6">
              <legend className="px-2 font-display text-xl font-bold text-navy">¿Cómo querés recibir tu pedido?</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {method && !abroad && (
                  <Link href={deliveryHref} aria-current={!pickupChosen && !intlChosen ? "true" : undefined} className={cn("rounded-2xl border-2 p-4 transition", !pickupChosen && !intlChosen ? "border-navy bg-celeste/30" : "border-celeste hover:border-aqua")}>
                    <span className="block font-display font-bold text-navy">{method.name}</span>
                    <span className="mt-1 block text-sm text-ink/70">Te lo enviamos a la dirección que indiques en Costa Rica.</span>
                  </Link>
                )}
                {abroad && (
                  <Link href={routes.checkout} className="rounded-2xl border-2 border-celeste p-4 transition hover:border-aqua">
                    <span className="block font-display font-bold text-navy">Envío nacional</span>
                    <span className="mt-1 block text-sm text-ink/70">Te lo enviamos a la dirección que indiques en Costa Rica.</span>
                  </Link>
                )}
                {shipping.required && (
                  <Link href={intlHref} aria-current={intlChosen ? "true" : undefined} className={cn("rounded-2xl border-2 p-4 transition", intlChosen ? "border-navy bg-celeste/30" : "border-celeste hover:border-aqua")}>
                    <span className="block font-display font-bold text-navy">Envío internacional</span>
                    <span className="mt-1 block text-sm text-ink/70">A países de América. Solo para merch (camisas y gorras).</span>
                  </Link>
                )}
                {shipping.pickup && (
                  <Link href={pickupHref} aria-current={pickupChosen ? "true" : undefined} className={cn("rounded-2xl border-2 p-4 transition", pickupChosen ? "border-navy bg-celeste/30" : "border-celeste hover:border-aqua")}>
                    <span className="block font-display font-bold text-navy">{shipping.pickup.name}</span>
                    <span className="mt-1 block text-sm text-ink/70">{shipping.pickup.amount === 0 ? "Sin costo de envío." : `Costo: ${money(shipping.pickup.amount)}.`}</span>
                  </Link>
                )}
              </div>
            </fieldset>
          )}
          {pickupChosen && shipping.selected ? (
            <div className="rounded-3xl border border-celeste p-5 sm:p-6">
              <h2 className="font-display text-xl font-bold text-navy">{shipping.selected.name}</h2>
              {shipping.selected.description && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/80">{shipping.selected.description}</p>}
              <p className="mt-3 text-sm text-ink/75">Costo de envío: <strong className="text-navy">{shipping.selected.amount === 0 ? "Gratis" : money(shipping.selected.amount)}</strong>. Cuando tu pedido esté listo te contactamos para coordinar el retiro.</p>
              {hasDigital && <p className="mt-3 rounded-2xl bg-aqua/15 p-4 text-sm text-navy">Los productos digitales de tu carrito se descargan en línea: no se retiran.</p>}
            </div>
          ) : (
          <form method="get" action={routes.checkout} className="space-y-6">
            <fieldset className="rounded-3xl border border-celeste p-5 sm:p-6">
              <legend className="px-2 font-display text-xl font-bold text-navy">¿A dónde lo enviamos?</legend>
              <p className="mt-2 text-sm font-semibold text-navy">Enviamos a Costa Rica y, solo en el caso del merch (camisas y gorras), a países de América.</p>
              {countryRejected && <Notice tone="error" className="mt-3">Solo enviamos a Costa Rica y a países de América. Elegí uno de la lista.</Notice>}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="font-display text-sm font-bold text-navy">
                  País
                  <CountrySelect value={country} action={routes.checkout} className={`${input} mt-1.5 font-sans font-normal`} />
                </label>
                {country === "" ? null : abroad ? (
                  <label className="font-display text-sm font-bold text-navy">
                    Estado / provincia
                    <input name="provincia" required maxLength={80} defaultValue={destination?.province ?? ""} className={`${input} mt-1.5 font-sans font-normal`} />
                  </label>
                ) : (
                  <label className="font-display text-sm font-bold text-navy">
                    Provincia / región
                    <select name="provincia" required defaultValue={destination?.province ?? ""} className={`${input} mt-1.5 font-sans font-normal`}>
                      <option value="" disabled>Elegí tu provincia</option>
                      {CR_PROVINCES.map((province) => <option key={province} value={province}>{province}</option>)}
                    </select>
                  </label>
                )}
                {country !== "" && <label className="font-display text-sm font-bold text-navy">{abroad ? "Ciudad" : "Ciudad / cantón"}<input name="ciudad" required={abroad} maxLength={80} defaultValue={destination?.city ?? ""} className={`${input} mt-1.5 font-sans font-normal`} /></label>}
                {country === "" ? null : abroad ? (
                  <label className="font-display text-sm font-bold text-navy">Código postal<input name="cp" required maxLength={10} defaultValue={destination?.postalCode ?? ""} className={`${input} mt-1.5 font-sans font-normal`} /></label>
                ) : (
                  <label className="font-display text-sm font-bold text-navy">Código postal (5 dígitos)<input name="cp" required inputMode="numeric" pattern="[0-9]{5}" maxLength={5} defaultValue={destination?.postalCode ?? ""} className={`${input} mt-1.5 font-sans font-normal`} /></label>
                )}
              </div>
              {country === "" && <p className="mt-3 text-sm text-ink/75">Elegí tu país para ver si enviamos allí y cuánto cuesta.</p>}
              <p className="mt-3 text-xs text-ink/60">La dirección exacta y tus datos se piden en el siguiente paso.</p>
            </fieldset>

            <fieldset className="rounded-3xl border border-celeste p-5 sm:p-6">
              <legend className="px-2 font-display text-xl font-bold text-navy">Envío</legend>
              {country === "" ? (
                <div className="mt-2">
                  <p className="font-display text-lg font-bold text-navy">Envío internacional</p>
                  <p className="mt-1 text-sm text-ink/75">Elegí tu país para ver el costo del envío.</p>
                </div>
              ) : method ? (
                <div className="mt-2">
                  <p className="font-display text-lg font-bold text-navy">{method.name}</p>
                  {method.description && <p className="mt-1 text-sm leading-relaxed text-ink/75">{method.description}</p>}
                </div>
              ) : (
                !abroad && <p className="mt-2 text-sm font-semibold text-coral">No hay un método de envío disponible por el momento.</p>
              )}
              {countryProblem && <p className="mt-3 text-sm font-semibold text-coral">Solo enviamos a Costa Rica y a países de América.</p>}
              {restricted && (
                <div className="mt-3 rounded-2xl bg-coral/10 p-4 text-sm leading-relaxed text-ink">
                  <p className="font-semibold text-coral">{COUNTRY_ONLY_MESSAGE}</p>
                  <p className="mt-1">No podemos enviar a {countryName(country)}: {shipping.restrictedNames.join(", ")}. Quitalo del carrito para comprar el merch, o elegí Costa Rica como destino.</p>
                  <Link href={routes.cart} className="mt-2 inline-block font-semibold text-navy underline underline-offset-4">Ir al carrito</Link>
                </div>
              )}
              {abroad && country !== "" && !countryProblem && !restricted && shipping.state === "needs_destination" && <p className="mt-3 text-sm text-ink/75">Escribí tu dirección para ver el costo del envío.</p>}
              {method && !countryProblem && !abroad && shipping.state === "needs_destination" && <p className="mt-3 text-sm text-ink/75">Seleccioná tu provincia para ver el costo del envío.</p>}
              {!countryProblem && !restricted && shipping.state === "not_configured" && <p className="mt-3 text-sm font-semibold text-coral">{abroad ? `Todavía no enviamos a ${countryName(country)}. Escribinos a tienda@azulclaritocr.com y vemos cómo ayudarte.` : "El envío para este destino todavía no está configurado."}</p>}
              {abroad && shipping.state === "selected" && <p className="mt-3 text-xs text-ink/60">Los impuestos o aranceles de importación de tu país, si los hay, no están incluidos en el total y los paga quien recibe el paquete.</p>}
              {method && shipping.state === "selected" && shipping.selected && (
                <p className="mt-3 text-sm text-ink/75">
                  Costo de envío: <strong className="text-navy">{shipping.selected.free ? "Gratis" : money(shipping.selected.amount)}</strong>
                  {shipping.selected.note && ` · ${shipping.selected.note}`}
                  {shipping.selected.estimatedDaysMin !== null && ` · Entrega estimada: ${shipping.selected.estimatedDaysMin}${shipping.selected.estimatedDaysMax !== null && shipping.selected.estimatedDaysMax !== shipping.selected.estimatedDaysMin ? `–${shipping.selected.estimatedDaysMax}` : ""} días`}
                </p>
              )}
            </fieldset>
            {hasDigital && <p className="rounded-2xl bg-aqua/15 p-4 text-sm text-navy">Los productos digitales de tu carrito no pagan envío: la tarifa se calcula solo con los productos físicos.</p>}
            {country !== "" && <button type="submit" className="inline-flex min-h-12 items-center rounded-full border-2 border-navy px-8 py-3 font-display font-bold text-navy hover:bg-navy hover:text-paper">Actualizar resumen</button>}
          </form>
          )}
          </>
          )}
          {pending ? (
            <PendingOrderPanel orderNumber={pending.orderNumber} total={money(pending.total)} />
          ) : !paymentsEnabled ? (
            <Notice tone="warning">El pago en línea no está disponible por el momento. Escribinos y te ayudamos a completar tu compra.</Notice>
          ) : totals.canProceed && totals.total !== null && (digitalOnly || pickupChosen) ? (
            <CheckoutForm mode="billing" pickup={pickupChosen} province="" city="" postalCode="" seenTotal={totals.total} defaults={{ name: session?.name ?? "", email: session?.email ?? "" }} />
          ) : totals.canProceed && totals.total !== null && destination ? (
            <CheckoutForm mode="shipping" country={country} province={destination.province ?? ""} city={destination.city ?? ""} postalCode={destination.postalCode ?? ""} seenTotal={totals.total} defaults={{ name: session?.name ?? "", email: session?.email ?? "" }} />
          ) : null}
          </div>

          <aside className="rounded-3xl border border-celeste bg-celeste/20 p-6 lg:sticky lg:top-32" aria-label="Resumen de la compra">
            <h2 className="text-xl font-bold">Resumen</h2>
            <ul className="mt-4 divide-y divide-celeste/60">
              {cart.lines.map((line) => (
                <li key={line.id} className="flex gap-3 py-3">
                  <div className="w-14 shrink-0"><ProductImage src={line.imageUrl} alt={line.imageAlt ?? line.name} className="rounded-xl" sizes="56px" /></div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-display font-bold text-navy">{line.name}</p>
                    {line.variantLabel && <p className="text-ink/70">{line.variantLabel}</p>}
                    {line.fulfillment === "DIGITAL" && <p className="text-ink/70">Digital · PDF · sin envío</p>}
                    <p className="text-ink/60">{line.quantity} × {formatMoney(line.unitPrice, toCurrency(line.currency))}</p>
                    {line.status !== "ok" && <p className="font-semibold text-coral">{line.status === "unavailable" ? "Ya no está disponible" : "Stock insuficiente"}</p>}
                  </div>
                  <p className={cn("font-display font-bold", line.status === "ok" ? "text-navy" : "text-ink/40 line-through")}>{formatMoney(line.lineTotal, toCurrency(line.currency))}</p>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 border-t border-celeste pt-4 text-sm">
              <div className={row}><dt>Subtotal</dt><dd className="font-semibold">{money(totals.subtotal)}</dd></div>
              <div className={row}>
                <dt>{!tax.applied ? "Impuestos" : tax.included ? `Impuestos incluidos (${tax.name}${tax.rateBps !== null ? `, ${formatBps(tax.rateBps)}` : ""})` : `Impuestos (${tax.name}${tax.rateBps !== null ? `, ${formatBps(tax.rateBps)}` : ""})`}</dt>
                <dd className="font-semibold">{tax.applied ? money(tax.amount) : "No aplican"}</dd>
              </div>
              <div className={row}>
                <dt>{digitalOnly ? "Envío" : pickupChosen ? (shipping.selected?.name ?? "Retiro en persona") : country === "" ? "Envío internacional" : (method?.name ?? "Envío")}</dt>
                <dd className="max-w-[12rem] text-right font-semibold">
                  {digitalOnly ? `${money(0)} · entrega digital`
                    : pickupChosen && shipping.selected ? (shipping.selected.amount === 0 ? "Gratis" : money(shipping.selected.amount))
                    : country === "" ? "Elegí tu país para ver el costo del envío"
                    : countryProblem ? "Solo enviamos a Costa Rica y a América"
                    : restricted ? "No disponible para este destino"
                    : !method && abroad ? `Todavía no enviamos a ${countryName(country)}`
                    : !method ? "No hay un método de envío disponible por el momento."
                    : shipping.state === "selected" && shipping.selected ? (shipping.selected.free ? "Gratis" : money(shipping.selected.amount))
                    : shipping.state === "needs_destination" ? "Seleccioná tu dirección para ver el costo del envío"
                    : "El envío para este destino todavía no está configurado."}
                </dd>
              </div>
              <div className={cn(row, "border-t border-celeste pt-3 text-base")}>
                <dt className="font-display text-lg font-bold text-navy">Total</dt>
                <dd className="font-display text-2xl font-bold text-navy">{totals.total !== null ? money(totals.total) : "—"}</dd>
              </div>
              {totals.total === null && totals.blockers.length === 0 && !digitalOnly && <p className="text-xs text-ink/60">El total aparece cuando el envío tenga costo para tu destino.</p>}
            </dl>

          </aside>
        </div>
      </Container>
    </section>
  );
}
