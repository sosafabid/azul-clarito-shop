import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/Notice";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getDb, isDatabaseConfigured } from "@/db";
import { customerStatus, safeTrackingUrl } from "@/domain/customer-orders";
import { formatMoney, toCurrency } from "@/domain/money";
import { requireUser } from "@/server/auth";
import { getAccountOverview } from "@/server/services/accounts";
import { getCustomerOrder } from "@/server/services/orders/customer";

export const metadata: Metadata = { title: "Detalle del pedido", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("es-CR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Costa_Rica" });

export default async function AccountOrderPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const session = await requireUser();
  const { orderNumber } = await params;
  if (!isDatabaseConfigured()) redirect(routes.account);
  const db = getDb();
  const overview = await getAccountOverview(db, session.userId);
  if (!overview) redirect(routes.accountLogin);
  // Si el pedido no es suyo, es igual que si no existiera (no se revela nada).
  const order = await getCustomerOrder(db, { userId: overview.id, email: overview.email, emailVerified: Boolean(overview.emailVerifiedAt) }, decodeURIComponent(orderNumber));
  if (!order) notFound();

  const money = (n: number) => formatMoney(n, toCurrency(order.currency));
  const status = customerStatus(order.status, order.requiresShipping);
  const tracking = safeTrackingUrl(order.trackingUrl);
  const hasDigital = order.items.some((i) => i.digital);

  return (
    <section className="bg-paper py-12 sm:py-16">
      <Container size="narrow" className="max-w-3xl space-y-6">
        <Link href={routes.accountOrders} className="text-sm font-semibold text-navy underline underline-offset-4">← Mis pedidos</Link>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-wide text-navy/70">Pedido {order.orderNumber}</p>
          <h1 className="mt-1 text-4xl font-bold">{status.label}</h1>
          <p className="mt-1 text-ink/75">Hecho el {dateFormat.format(order.placedAt)}. {status.hint}</p>
        </div>

        {order.status === "PENDING" && (
          <Notice tone="info">Si ya pagaste y el pedido sigue pendiente, escribinos a {siteConfig.contact.email} con tu número de pedido.</Notice>
        )}
        {hasDigital && ["PAID", "PREPARING", "PACKED", "SHIPPED", "DELIVERED"].includes(order.status) && (
          <Notice tone="success">
            Tus libros digitales se descargan con un enlace temporal.{" "}
            <Link href={routes.recoverPurchase} className="font-semibold underline underline-offset-4">Pedir un enlace nuevo</Link> con tu correo y número de pedido.
          </Notice>
        )}
        {order.status === "SHIPPED" && (order.carrier || order.trackingNumber || tracking) && (
          <div className="rounded-3xl border border-aqua/60 bg-paper p-5 text-sm">
            <h2 className="font-display text-lg font-bold text-navy">Seguimiento del envío</h2>
            {order.carrier && <p className="mt-1">Transportista: <strong>{order.carrier}</strong></p>}
            {order.trackingNumber && <p>Guía: <strong>{order.trackingNumber}</strong></p>}
            {tracking && <a href={tracking} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold text-navy underline underline-offset-4">Seguir mi envío</a>}
          </div>
        )}

        <div className="rounded-3xl border border-celeste bg-paper p-5 sm:p-6">
          <ul className="divide-y divide-celeste/60 text-sm">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-4 py-2">
                <span>
                  {item.name}
                  {item.variantOptions && Object.keys(item.variantOptions).length > 0 ? ` (${Object.values(item.variantOptions).join(", ")})` : ""} × {item.quantity}
                  {item.digital ? " · digital" : ""}
                </span>
                <span className="font-semibold">{money(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-celeste pt-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Impuestos</dt><dd>{money(order.taxTotal)}</dd></div>
            <div className="flex justify-between"><dt>Envío{order.shippingMethodName ? ` (${order.shippingMethodName})` : ""}</dt><dd>{!order.requiresShipping ? "No aplica (entrega digital)" : order.shippingTotal === 0 ? "Gratis" : money(order.shippingTotal)}</dd></div>
            <div className="flex justify-between text-base font-bold text-navy"><dt>Total</dt><dd>{money(order.total)}</dd></div>
          </dl>
          {order.destination && <p className="mt-3 text-xs text-ink/60">Entrega en: {order.destination}</p>}
          {order.customerNotes && <p className="mt-2 text-xs text-ink/60">Tu nota: {order.customerNotes}</p>}
        </div>

        <ul className="space-y-1 text-xs text-ink/65">
          {order.paidAt && <li>Pago confirmado el {dateFormat.format(order.paidAt)}</li>}
          {order.shippedAt && <li>Enviado el {dateFormat.format(order.shippedAt)}</li>}
          {order.deliveredAt && <li>Entregado el {dateFormat.format(order.deliveredAt)}</li>}
          {order.cancelledAt && <li>Cancelado el {dateFormat.format(order.cancelledAt)}</li>}
        </ul>
        <p className="text-sm text-ink/70">¿Dudas con tu pedido? Escribinos a {siteConfig.contact.email}.</p>
      </Container>
    </section>
  );
}
