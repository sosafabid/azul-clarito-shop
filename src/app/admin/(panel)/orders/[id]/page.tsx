import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelPendingButton, FulfillmentForm, ResolveReviewForm, VerifyPaymentButton } from "@/components/admin/OrderActions";
import { DatabaseNotice, Notice } from "@/components/admin/Notice";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/components/admin/order-labels";
import { card } from "@/components/admin/settings-ui";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { isUuid } from "@/domain/ids";
import { formatMoney, toCurrency } from "@/domain/money";
import { ORDER_STATUS_TRANSITIONS } from "@/domain/order-status";
import { can } from "@/domain/permissions";
import { requirePermission } from "@/server/auth";
import { FULFILLMENT_TARGETS, getAdminOrder } from "@/server/services/orders/admin";

export const metadata: Metadata = { title: "Pedido" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "medium", timeZone: "America/Costa_Rica" });
const fmt = (d: Date | null) => (d ? dateFormat.format(d) : "—");

const EVENT_LABELS: Record<string, string> = {
  order_created: "Pedido creado y stock reservado",
  session_created: "Página de pago de Tilopay creada",
  session_failed: "No se pudo crear la página de pago",
  browser_return: "La clienta volvió de Tilopay (dato del navegador, sin validez)",
  payment_confirmed: "Pago confirmado por Tilopay (verificado)",
  payment_confirmed_needs_review: "Pago aprobado en un pedido que no estaba pendiente — REVISAR",
  review_resolved: "Alerta de revisión resuelta (con nota)",
  payment_rejected: "Tilopay rechazó el pago",
  verify_not_found: "Tilopay aún no registra un pago aprobado",
  verify_mismatch: "Tilopay aprobó algo que NO coincide con el pedido — REVISAR",
  verify_reference_conflict: "Referencia de transacción duplicada — REVISAR",
  verify_error: "No se pudo consultar a Tilopay",
  order_cancelled: "Pedido cancelado y stock liberado",
};

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("orders:read");
  if (!isDatabaseConfigured()) return <DatabaseNotice />;
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const data = await getAdminOrder(getDb(), id);
  if (!data) notFound();
  const { order, items, payments, events, reservations, notifications } = data;
  const currency = toCurrency(order.currency);
  const money = (n: number) => formatMoney(n, currency);
  const canManage = can(session.role, "orders:fulfill");
  const address = order.shippingAddress;
  const nextStates = ORDER_STATUS_TRANSITIONS[order.status].filter((s) => (FULFILLMENT_TARGETS as readonly string[]).includes(s));
  const paid = payments.find((p) => p.status === "PAID");

  return (
    <div className="space-y-6">
      <div>
        <Link href={routes.adminOrders} className="text-sm font-semibold text-navy underline underline-offset-4">← Pedidos</Link>
        <h1 className="mt-2 text-3xl font-bold">Pedido {order.orderNumber}</h1>
        <p className="mt-1 text-sm text-ink/70">Creado el {fmt(order.placedAt)} · Estado: <strong>{ORDER_STATUS_LABELS[order.status]}</strong> · Pago: <strong>{paid ? "Confirmado" : (PAYMENT_STATUS_LABELS[payments.at(-1)?.status ?? ""] ?? "—")}</strong></p>
      </div>

      {order.paymentReviewReason && (
        <Notice tone="error">
          <strong>Requiere revisión:</strong> {order.paymentReviewReason}
          <ResolveReviewForm orderId={order.id} />
        </Notice>
      )}

      <section className={card}>
        <h2 className="text-xl font-bold">Resumen</h2>
        <table className="mt-3 w-full text-left text-sm">
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-celeste/50">
                <td className="py-2 pr-3">{item.name}<span className="block text-xs text-ink/60">SKU {item.sku}</span></td>
                <td className="py-2 pr-3 whitespace-nowrap">{item.quantity} × {money(item.unitPrice)}</td>
                <td className="py-2 text-right whitespace-nowrap">{money(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Impuestos{order.pricingSnapshot?.tax.included ? " (incluidos)" : ""}{order.pricingSnapshot?.tax.name ? ` · ${order.pricingSnapshot.tax.name}` : ""}</dt><dd>{money(order.taxTotal)}</dd></div>
          <div className="flex justify-between"><dt>Envío{order.shippingMethodName ? ` · ${order.shippingMethodName}` : ""}</dt><dd>{money(order.shippingTotal)}</dd></div>
          <div className="flex justify-between border-t border-celeste pt-2 text-base font-bold"><dt>Total ({order.currency})</dt><dd>{money(order.total)}</dd></div>
        </dl>
        <p className="mt-2 text-xs text-ink/60">Montos históricos: se guardaron al crear el pedido y no cambian si después cambian precios, tasas o tarifas.</p>
      </section>

      <section className={card}>
        <h2 className="text-xl font-bold">Cliente y entrega</h2>
        <p className="mt-2 text-sm">{order.customerName ?? "—"} · <span className="break-all">{order.email}</span> · {order.customerPhone ?? "sin teléfono"}</p>
        <p className="mt-1 text-sm">{address.line1}{address.line2 ? `, ${address.line2}` : ""} · {address.district ? `${address.district}, ` : ""}{address.city}, {address.stateProvince} · CP {address.postalCode ?? "—"} · Costa Rica</p>
        {order.customerNotes && <p className="mt-1 text-sm">Nota de la clienta: {order.customerNotes}</p>}
      </section>

      <section className={card}>
        <h2 className="text-xl font-bold">Pagos (Tilopay)</h2>
        {payments.length === 0 ? <p className="mt-2 text-sm text-ink/70">Sin intentos de pago.</p> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead><tr className="border-b border-celeste text-xs uppercase tracking-wide text-ink/60"><th className="py-2 pr-3">Intento</th><th className="py-2 pr-3">Estado</th><th className="py-2 pr-3">orderNumber enviado</th><th className="py-2 pr-3">Transacción Tilopay</th><th className="py-2 pr-3">Ambiente</th><th className="py-2">Verificado</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-celeste/50">
                    <td className="py-2 pr-3">#{p.attempt}</td>
                    <td className="py-2 pr-3">{PAYMENT_STATUS_LABELS[p.status] ?? p.status}{p.failureReason ? <span className="block text-xs text-ink/60">{p.failureReason}</span> : null}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{p.providerOrderNumber ?? "—"}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{p.providerReference ?? "—"}</td>
                    <td className="py-2 pr-3">{p.providerEnvironment ?? "—"}</td>
                    <td className="py-2">{fmt(p.verifiedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {canManage && order.status === "PENDING" && (
          <div className="mt-4 flex flex-wrap items-start gap-4"><VerifyPaymentButton orderId={order.id} /><CancelPendingButton orderId={order.id} /></div>
        )}
        {reservations.length > 0 && <p className="mt-3 text-xs text-ink/60">Reservas de stock: {reservations.map((r) => `${r.quantity} u. ${r.status === "ACTIVE" ? `activa hasta ${fmt(r.expiresAt)}` : r.status === "COMMITTED" ? "vendidas" : "liberadas"}`).join(" · ")}</p>}
      </section>

      <section className={card}>
        <h2 className="text-xl font-bold">Envío manual</h2>
        <p className="mt-1 text-sm text-ink/70">Courier: {order.carrier ?? "—"} · Seguimiento: {order.trackingNumber ?? "—"} {order.trackingUrl ? <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-navy underline">(enlace)</a> : null} · Enviado: {fmt(order.shippedAt)} · Entregado: {fmt(order.deliveredAt)}</p>
        {canManage && nextStates.length > 0 ? (
          <div className="mt-4 space-y-4">
            {nextStates.map((next) => <FulfillmentForm key={next} orderId={order.id} current={order.status} next={next} carrier={order.carrier ?? ""} trackingNumber={order.trackingNumber ?? ""} trackingUrl={order.trackingUrl ?? ""} />)}
          </div>
        ) : order.status === "PENDING" ? <p className="mt-3 text-sm text-ink/70">El envío se habilita cuando el pago esté confirmado.</p> : null}
      </section>

      <section className={card}>
        <h2 className="text-xl font-bold">Historial de pagos y errores</h2>
        <ul className="mt-3 divide-y divide-celeste/50 text-sm">
          {events.map((event) => (
            <li key={event.id} className="py-2">
              <span className="text-xs text-ink/60">{fmt(event.createdAt)} · {event.source}</span>
              <p className="font-semibold">{EVENT_LABELS[event.type] ?? event.type}</p>
              {event.detail && Object.keys(event.detail).length > 0 && <p className="break-all font-mono text-xs text-ink/60">{JSON.stringify(event.detail)}</p>}
            </li>
          ))}
          {events.length === 0 && <li className="py-2 text-ink/70">Sin eventos.</li>}
        </ul>
        {notifications.length > 0 && (
          <p className="mt-3 text-xs text-ink/60">Correos: {notifications.map((n) => `${n.event} → ${n.status === "SENT" ? "enviado" : n.status === "FAILED" ? `FALLÓ (${n.lastError ?? "?"}, intento ${n.attempts})` : "en curso"}`).join(" · ")}</p>
        )}
      </section>
    </div>
  );
}
