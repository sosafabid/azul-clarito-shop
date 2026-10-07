import type { Metadata } from "next";
import Link from "next/link";
import { ProductImage } from "@/components/shop/ProductImage";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/Notice";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { formatMoney, toCurrency } from "@/domain/money";
import { COUNTRY_ONLY_MESSAGE, CR_PROVINCES, STORE_COUNTRY_NAME, parseDestination } from "@/domain/shipping";
import { formatBps } from "@/domain/tax";
import { cn } from "@/lib/utils";
import { calculateCheckoutTotals } from "@/server/services/checkout/totals";
import { getCartOwner } from "@/server/services/cart/identity";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false, follow: false } };
// Todo se recalcula en el servidor en cada visita (precios, impuesto, tarifas y stock vigentes).
export const dynamic = "force-dynamic";

const input = "w-full rounded-xl border-2 border-celeste bg-paper px-3 py-2.5 text-ink focus:border-aqua focus:outline-none";
const row = "flex items-baseline justify-between gap-4";

/**
 * CHECKOUT: resumen de la compra.
 *  - Se envía SOLO dentro de Costa Rica: el país es fijo (no hay selector) y el servidor RECHAZA cualquier otro.
 *  - La URL solo trae el destino (provincia, ciudad, código postal). Nunca montos: el subtotal, el impuesto, el envío
 *    y el total salen de `calculateCheckoutTotals`, que lo lee todo de PostgreSQL.
 *  - El envío es un único método, "Envío nacional", con la tarifa que Azul Clarito configuró. La logística real es manual.
 * Todavía no hay pago ni orden: el botón final queda deshabilitado.
 */
export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ pais?: string; provincia?: string; ciudad?: string; cp?: string }> }) {
  if (!isDatabaseConfigured()) {
    return <ComingSoon title="Finalizar compra" description="El proceso de compra todavía no está disponible." back={{ label: "Volver al carrito", href: routes.cart }} />;
  }
  const params = await searchParams;
  const { destination, countryRejected } = parseDestination(params);
  const { totals, cart } = await calculateCheckoutTotals(getDb(), { owner: await getCartOwner(), destination, shippingMethodId: null });
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
          <form method="get" action={routes.checkout} className="space-y-6">
            <fieldset className="rounded-3xl border border-celeste p-5 sm:p-6">
              <legend className="px-2 font-display text-xl font-bold text-navy">¿A dónde lo enviamos?</legend>
              <p className="mt-2 text-sm font-semibold text-navy">{COUNTRY_ONLY_MESSAGE}</p>
              {countryRejected && <Notice tone="error" className="mt-3">No podemos enviar fuera de Costa Rica. Elegí una provincia del país.</Notice>}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="font-display text-sm font-bold text-navy">
                  País
                  <p className="mt-1.5 rounded-xl border-2 border-celeste bg-celeste/20 px-3 py-2.5 font-sans font-normal text-ink">{STORE_COUNTRY_NAME}</p>
                </div>
                <label className="font-display text-sm font-bold text-navy">
                  Provincia / región
                  <select name="provincia" required defaultValue={destination?.province ?? ""} className={`${input} mt-1.5 font-sans font-normal`}>
                    <option value="" disabled>Elegí tu provincia</option>
                    {CR_PROVINCES.map((province) => <option key={province} value={province}>{province}</option>)}
                  </select>
                </label>
                <label className="font-display text-sm font-bold text-navy">Ciudad / cantón<input name="ciudad" defaultValue={destination?.city ?? ""} className={`${input} mt-1.5 font-sans font-normal`} /></label>
                <label className="font-display text-sm font-bold text-navy">Código postal (opcional)<input name="cp" defaultValue={destination?.postalCode ?? ""} className={`${input} mt-1.5 font-sans font-normal`} /></label>
              </div>
              <p className="mt-3 text-xs text-ink/60">La dirección completa de entrega se pide en el siguiente paso.</p>
            </fieldset>

            <fieldset className="rounded-3xl border border-celeste p-5 sm:p-6">
              <legend className="px-2 font-display text-xl font-bold text-navy">Envío</legend>
              {method ? (
                <div className="mt-2">
                  <p className="font-display text-lg font-bold text-navy">{method.name}</p>
                  {method.description && <p className="mt-1 text-sm leading-relaxed text-ink/75">{method.description}</p>}
                </div>
              ) : (
                <p className="mt-2 text-sm font-semibold text-coral">No hay un método de envío disponible por el momento.</p>
              )}
              {method && countryProblem && <p className="mt-3 text-sm font-semibold text-coral">{COUNTRY_ONLY_MESSAGE}</p>}
              {method && !countryProblem && shipping.state === "needs_destination" && <p className="mt-3 text-sm text-ink/75">Seleccioná tu provincia para ver el costo del envío.</p>}
              {method && !countryProblem && shipping.state === "not_configured" && <p className="mt-3 text-sm font-semibold text-coral">El envío para este destino todavía no está configurado.</p>}
              {method && shipping.state === "selected" && shipping.selected && (
                <p className="mt-3 text-sm text-ink/75">
                  Costo de envío: <strong className="text-navy">{shipping.selected.free ? "Gratis" : money(shipping.selected.amount)}</strong>
                  {shipping.selected.estimatedDaysMin !== null && ` · Entrega estimada: ${shipping.selected.estimatedDaysMin}${shipping.selected.estimatedDaysMax !== null && shipping.selected.estimatedDaysMax !== shipping.selected.estimatedDaysMin ? `–${shipping.selected.estimatedDaysMax}` : ""} días`}
                </p>
              )}
            </fieldset>
            <button type="submit" className="inline-flex min-h-12 items-center rounded-full border-2 border-navy px-8 py-3 font-display font-bold text-navy hover:bg-navy hover:text-paper">Actualizar resumen</button>
          </form>

          <aside className="rounded-3xl border border-celeste bg-celeste/20 p-6 lg:sticky lg:top-32" aria-label="Resumen de la compra">
            <h2 className="text-xl font-bold">Resumen</h2>
            <ul className="mt-4 divide-y divide-celeste/60">
              {cart.lines.map((line) => (
                <li key={line.id} className="flex gap-3 py-3">
                  <div className="w-14 shrink-0"><ProductImage src={line.imageUrl} alt={line.imageAlt ?? line.name} className="rounded-xl" sizes="56px" /></div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-display font-bold text-navy">{line.name}</p>
                    {line.variantLabel && <p className="text-ink/70">{line.variantLabel}</p>}
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
                <dt>{method?.name ?? "Envío"}</dt>
                <dd className="max-w-[12rem] text-right font-semibold">
                  {countryProblem ? COUNTRY_ONLY_MESSAGE
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
              {totals.total === null && totals.blockers.length === 0 && <p className="text-xs text-ink/60">El total aparece cuando el envío tenga costo para tu destino.</p>}
            </dl>

            <button type="button" disabled aria-disabled="true" aria-describedby="pay-soon" className="mt-6 inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-full bg-navy/40 px-8 py-3 font-display font-bold text-paper">Continuar al pago</button>
            <p id="pay-soon" className="mt-2 text-center text-sm font-semibold text-navy/80">{totals.canProceed ? "El pago estará disponible próximamente." : "Para continuar necesitamos un envío válido para tu destino."}</p>
          </aside>
        </div>
      </Container>
    </section>
  );
}
