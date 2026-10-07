import type { Metadata } from "next";
import Link from "next/link";
import { CartLineControls } from "@/components/cart/CartLineControls";
import { ProductImage } from "@/components/shop/ProductImage";
import { CartIcon } from "@/components/ui/icons";
import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/Notice";
import { routes } from "@/config/routes";
import { formatMoney, toCurrency } from "@/domain/money";
import { cn } from "@/lib/utils";
import { getCartViewForRequest } from "@/server/services/cart/request";

export const metadata: Metadata = { title: "Tu carrito", robots: { index: false, follow: false } };

// El carrito se revalida contra la base de datos en cada visita (precio, estado y stock actuales).
export const dynamic = "force-dynamic";

const buttonBase = "inline-flex min-h-12 w-full items-center justify-center rounded-full px-8 py-3 font-display font-bold transition-colors";

function EmptyCart() {
  return (
    <section className="bg-gradient-to-b from-celeste/40 to-paper py-20 sm:py-28">
      <Container size="narrow" className="text-center">
        <span className="mx-auto inline-flex size-20 items-center justify-center rounded-full bg-celeste/60 text-navy">
          <CartIcon className="size-10" />
        </span>
        <h1 className="mt-6 text-4xl font-bold sm:text-5xl">Tu carrito está vacío.</h1>
        <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-ink/75">Todavía no elegiste nada. Cuando algo del Caribe te haga ruido, guardalo acá.</p>
        <Link href={routes.shop} className="mt-8 inline-flex min-h-12 items-center rounded-full bg-navy px-8 py-3 font-display font-bold text-paper hover:bg-ink">
          Explorar la tienda
        </Link>
      </Container>
    </section>
  );
}

export default async function CartPage() {
  const cart = await getCartViewForRequest();
  if (!cart || cart.lines.length === 0) return <EmptyCart />;

  const currency = toCurrency(cart.currency ?? "CRC");

  return (
    <section className="bg-paper py-10 sm:py-14">
      <Container>
        <h1 className="text-4xl font-bold sm:text-5xl">Tu carrito</h1>
        <p className="mt-2 text-ink/70">
          {cart.totalUnits} {cart.totalUnits === 1 ? "unidad" : "unidades"}
        </p>

        {cart.hasIssues && (
          <Notice tone="warning" className="mt-6">
            Algunos productos cambiaron desde que los agregaste. Revisá los que están marcados antes de continuar.
          </Notice>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
          <ul className="space-y-4">
            {cart.lines.map((line) => (
              <li
                key={line.id}
                className={cn("rounded-3xl border bg-paper p-4 sm:p-5", line.status === "ok" ? "border-celeste" : "border-coral/60 bg-coral/5")}
              >
                <div className="flex gap-4">
                  <Link href={routes.product(line.slug)} className="block w-24 shrink-0 sm:w-28" aria-label={`Ver ${line.name}`}>
                    <ProductImage src={line.imageUrl} alt={line.imageAlt ?? line.name} className="rounded-2xl" sizes="112px" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <div className="min-w-0">
                        <Link href={routes.product(line.slug)} className="font-display text-lg font-bold text-navy hover:underline">
                          {line.name}
                        </Link>
                        {line.variantLabel && <p className="text-sm font-semibold text-ink/80">{line.variantLabel}</p>}
                        <p className="text-xs text-ink/55">SKU {line.sku}</p>
                      </div>
                      <p className="text-right">
                        <span className="block text-sm text-ink/70">{formatMoney(line.unitPrice, toCurrency(line.currency))} c/u</span>
                        <span className={cn("block font-display text-lg font-bold", line.status === "ok" ? "text-navy" : "text-ink/40 line-through")}>
                          {formatMoney(line.lineTotal, toCurrency(line.currency))}
                        </span>
                      </p>
                    </div>

                    {line.status === "unavailable" && <p className="mt-2 text-sm font-bold text-coral">Este producto ya no está disponible.</p>}
                    {line.status === "insufficient" && (
                      <p className="mt-2 text-sm font-bold text-coral">
                        Solo {line.availableNow === 1 ? "queda 1 unidad" : `quedan ${line.availableNow} unidades`}. Ajustá la cantidad para continuar.
                      </p>
                    )}

                    <div className="mt-3">
                      <CartLineControls
                        lineId={line.id}
                        name={line.name}
                        quantity={line.quantity}
                        maxQuantity={line.maxQuantity}
                        status={line.status}
                        availableNow={line.availableNow}
                      />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="rounded-3xl border border-celeste bg-celeste/20 p-6 lg:sticky lg:top-32" aria-label="Resumen del carrito">
            <h2 className="text-xl font-bold">Resumen</h2>
            <dl className="mt-4 flex items-baseline justify-between gap-4">
              <dt className="font-display font-bold text-navy">Subtotal</dt>
              <dd className="font-display text-2xl font-bold text-navy">{formatMoney(cart.subtotal, currency)}</dd>
            </dl>
            {cart.hasIssues && <p className="mt-2 text-xs text-ink/60">No incluye los productos que requieren atención.</p>}
            <p className="mt-3 text-sm text-ink/65">Los impuestos y el envío se calcularán en el siguiente paso.</p>

            <div className="mt-6 space-y-3">
              {cart.hasIssues ? (
                <>
                  <button type="button" disabled aria-disabled="true" aria-describedby="checkout-blocked" className={`${buttonBase} cursor-not-allowed bg-navy/40 text-paper`}>
                    Continuar al checkout
                  </button>
                  <p id="checkout-blocked" className="text-center text-sm font-semibold text-navy/80">
                    Revisá los productos marcados para poder continuar.
                  </p>
                </>
              ) : (
                <Link href={routes.checkout} className={`${buttonBase} bg-navy text-paper hover:bg-ink`}>
                  Continuar al checkout
                </Link>
              )}
              <Link href={routes.shop} className={`${buttonBase} border-2 border-navy text-navy hover:bg-navy hover:text-paper`}>
                Seguir comprando
              </Link>
            </div>
          </aside>
        </div>
      </Container>
    </section>
  );
}
