import type { Metadata } from "next";
import Link from "next/link";
import { ResultAction } from "@/components/checkout/ResultActions";
import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/Notice";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getDb, isDatabaseConfigured } from "@/db";
import { formatMoney, toCurrency } from "@/domain/money";
import { loadCheckoutResult } from "@/server/services/checkout/result";

export const metadata: Metadata = { title: "Estado de tu pedido", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * RESULTADO DEL PAGO. Solo LEE la base de datos: el estado que se muestra es el que dejó la verificación servidor a servidor con
 * Tilopay, nunca lo que traiga la URL. Se entra con un enlace privado (token aleatorio); sin token válido no se muestra ningún dato.
 */
export default async function CheckoutResultPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : "";
  const result = isDatabaseConfigured() ? await loadCheckoutResult(getDb(), token) : null;

  if (!result) {
    return (
      <section className="bg-paper py-16">
        <Container size="narrow" className="text-center">
          <h1 className="text-3xl font-bold">No encontramos ese pedido</h1>
          <p className="mt-3 text-ink/75">Revisá el enlace que te enviamos por correo o escribinos a {siteConfig.contact.email}.</p>
          <Link href={routes.shop} className="mt-8 inline-flex min-h-12 items-center rounded-full bg-navy px-8 py-3 font-display font-bold text-paper hover:bg-ink">Volver a la tienda</Link>
        </Container>
      </section>
    );
  }

  const money = (n: number) => formatMoney(n, toCurrency(result.currency));
  const { view } = result;
  const heading = {
    paid: "¡Pago confirmado!",
    verifying: "Estamos esperando la confirmación de tu pago",
    failed: "No pudimos confirmar tu pago",
    cancelled: "Este pedido fue cancelado",
  }[view];

  return (
    <section className="bg-gradient-to-b from-celeste/40 to-paper py-12 sm:py-16">
      <Container size="narrow">
        <p className="font-display text-sm font-bold uppercase tracking-wide text-navy/70">Pedido {result.orderNumber}</p>
        <h1 className="mt-2 text-4xl font-bold">{heading}</h1>

        {view === "paid" && <Notice tone="success" className="mt-5">Gracias por tu compra. Tilopay confirmó el pago{result.requiresShipping ? " y ya estamos preparando tu pedido" : ""}. Te enviamos la confirmación a {result.email}.</Notice>}
        {view === "paid" && result.downloads.length > 0 && (
          <div className="mt-5 rounded-3xl border-2 border-aqua/60 bg-paper p-5 sm:p-6">
            <h2 className="font-display text-xl font-bold text-navy">Tus libros digitales</h2>
            <ul className="mt-3 space-y-3">
              {result.downloads.map((item) => (
                <li key={item.orderItemId} className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-semibold text-ink">{item.name}</span>
                  {item.available ? (
                    <a href={`/api/downloads/${item.orderItemId}?t=${encodeURIComponent(token)}`} rel="nofollow" className="inline-flex min-h-11 items-center rounded-full bg-navy px-6 py-2 font-display text-sm font-bold text-paper hover:bg-ink">Descargar PDF</a>
                  ) : (
                    <span className="text-sm text-coral">Archivo en revisión: escribinos a {siteConfig.contact.email}</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-ink/65">
              {result.downloadsEmailed ? `También te enviamos los enlaces a ${result.email}; duran 72 horas. ` : ""}
              Podés volver a esta página cuando quieras para descargar de nuevo, o <Link href={routes.recoverPurchase} className="font-semibold text-navy underline underline-offset-4">pedir un enlace nuevo</Link> con tu correo y número de pedido.
            </p>
          </div>
        )}
        {view === "verifying" && <Notice tone="info" className="mt-5">Todavía no recibimos la confirmación de Tilopay. <strong>No se ha confirmado ningún cobro.</strong> Si ya pagaste, tocá «Verificar mi pago» en unos segundos. Tu pedido queda guardado por un tiempo limitado.</Notice>}
        {view === "failed" && <Notice tone="error" className="mt-5">El pago no fue aprobado. Podés intentar de nuevo con la misma tarjeta u otra. Si tu banco muestra un cargo que no ves reflejado acá, escribinos a {siteConfig.contact.email}.</Notice>}
        {view === "cancelled" && result.chargedWhileCancelled && <Notice tone="warning" className="mt-5"><strong>Recibimos un pago para este pedido, pero ya había sido cancelado.</strong> Nuestro equipo lo está revisando y se va a comunicar con vos para reembolsarte o completar el pedido. Si querés, escribinos a {siteConfig.contact.email} con tu número de pedido.</Notice>}
        {view === "cancelled" && !result.chargedWhileCancelled && <Notice tone="warning" className="mt-5">Los productos volvieron a estar disponibles. Si de todos modos se te hizo un cargo, escribinos a {siteConfig.contact.email} con tu número de pedido.</Notice>}
        {result.sessionProblem && view !== "paid" && view !== "cancelled" && <Notice tone="warning" className="mt-4">No pudimos abrir la página de pago. Tu pedido quedó guardado: podés reintentar o escribirnos a {siteConfig.contact.email}.</Notice>}

        <div className="mt-6 rounded-3xl border border-celeste bg-paper p-5 sm:p-6">
          <ul className="divide-y divide-celeste/60 text-sm">
            {result.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-4 py-2"><span>{item.name} × {item.quantity}</span><span className="font-semibold">{money(item.lineTotal)}</span></li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-celeste pt-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(result.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Impuestos</dt><dd>{money(result.taxTotal)}</dd></div>
            <div className="flex justify-between"><dt>Envío</dt><dd>{!result.requiresShipping ? "No aplica (entrega digital)" : result.shippingTotal === 0 ? "Gratis" : money(result.shippingTotal)}</dd></div>
            <div className="flex justify-between text-base font-bold text-navy"><dt>Total</dt><dd>{money(result.total)}</dd></div>
          </dl>
          {result.requiresShipping && <p className="mt-3 text-xs text-ink/60">Entrega en: {result.destination}</p>}
        </div>

        {(view === "verifying" || view === "failed") && (
          <div className="mt-6 flex flex-wrap items-start gap-4">
            {view === "verifying" && <ResultAction which="refresh" token={token} />}
            <ResultAction which="retry" token={token} />
            <ResultAction which="cancel" token={token} />
          </div>
        )}
        <Link href={routes.shop} className="mt-8 inline-block text-sm font-semibold text-navy underline underline-offset-4">Seguir explorando la tienda</Link>
      </Container>
    </section>
  );
}
