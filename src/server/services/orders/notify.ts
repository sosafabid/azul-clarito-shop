import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { orderItems, orders, payments } from "@/db/schema";
import { toCurrency } from "@/domain/money";
import { serverConfig } from "@/config/server";
import { routes } from "@/config/routes";
import { getEmailService } from "@/server/services/email/service";
import type { OrderSummaryEmailData } from "@/server/services/email/events";

/**
 * CORREOS DE COMPRA — idempotentes.
 *
 * Antes de enviar, el evento se RECLAMA con una fila en `order_notifications` (única por pedido + evento): si el mismo evento
 * llega dos veces (retorno repetido, tarea de conciliación en paralelo), solo uno consigue la fila y el otro no envía nada.
 * Si Resend falla, la fila queda en FAILED (el pago ya está confirmado, el correo NO lo revierte) y la conciliación lo reintenta
 * hasta 5 veces. Un envío que se quedó "en vuelo" (PENDING hace más de 10 minutos) también puede reclamarse de nuevo.
 */
export type OrderEmailEvent = "order_received" | "payment_confirmed" | "payment_failed" | "order_cancelled" | "admin_new_order" | "admin_payment_review";
export const MAX_EMAIL_ATTEMPTS = 5;

async function claim(db: Database, orderId: string, key: string): Promise<boolean> {
  const result = await db.execute(sql`
    insert into order_notifications (order_id, event)
    values (${orderId}::uuid, ${key}::text)
    on conflict (order_id, event) do update
       set status = 'PENDING', attempts = order_notifications.attempts + 1, updated_at = now()
     where (order_notifications.status = 'FAILED' and order_notifications.attempts < ${MAX_EMAIL_ATTEMPTS}::int)
        or (order_notifications.status = 'PENDING' and order_notifications.updated_at < now() - interval '10 minutes')
    returning id
  `);
  return result.rows.length > 0;
}

async function finish(db: Database, orderId: string, key: string, error: string | null): Promise<void> {
  await db.execute(sql`
    update order_notifications
       set status = ${error === null ? "SENT" : "FAILED"}::text, last_error = ${error}::text, updated_at = now()
     where order_id = ${orderId}::uuid and event = ${key}::text
  `);
}

type LoadedOrder = {
  orderNumber: string;
  email: string;
  customerName: string | null;
  summary: OrderSummaryEmailData;
  transactionId: string | null;
  needsReview: boolean;
  reviewReason: string | null;
};

async function loadOrder(db: Database, orderId: string): Promise<LoadedOrder | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).orderBy(asc(orderItems.createdAt));
  const [paid] = await db.select({ ref: payments.providerReference }).from(payments).where(eq(payments.orderId, orderId)).orderBy(sql`(${payments.status} = 'PAID') desc`, asc(payments.attempt)).limit(1);
  const address = order.shippingAddress;
  return {
    orderNumber: order.orderNumber,
    email: order.email,
    customerName: order.customerName,
    transactionId: paid?.ref ?? null,
    needsReview: order.paymentReviewReason !== null,
    reviewReason: order.paymentReviewReason,
    summary: {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      total: order.total,
      currency: toCurrency(order.currency),
      items: items.map((item) => ({ name: item.nameSnapshot, quantity: item.quantity, lineTotal: item.lineTotal })),
      subtotal: order.subtotal,
      shippingTotal: order.shippingTotal,
      taxTotal: order.taxTotal,
      taxIncluded: order.pricingSnapshot?.tax.included ?? false,
      destination: [address.district, address.city, address.stateProvince].filter(Boolean).join(", "),
    },
  };
}

export function statusUrlFor(token: string | null | undefined): string | null {
  return token ? `${serverConfig.appBaseUrl}${routes.checkoutResult}?t=${encodeURIComponent(token)}` : null;
}

/** Envía (una sola vez) el correo `event` del pedido. Nunca lanza: un fallo de correo no debe afectar el pago. */
export async function sendOrderEmail(
  db: Database,
  input: { orderId: string; event: OrderEmailEvent; key?: string; token?: string | null },
): Promise<"sent" | "skipped" | "failed"> {
  const key = input.key ?? input.event;
  try {
    if (!(await claim(db, input.orderId, key))) return "skipped";
    const order = await loadOrder(db, input.orderId);
    if (!order) {
      await finish(db, input.orderId, key, "order_not_found");
      return "failed";
    }
    const statusUrl = statusUrlFor(input.token);
    const service = getEmailService();
    let result;
    if (input.event === "admin_new_order") {
      const to = serverConfig.email.adminNotifyTo;
      if (!to) {
        await finish(db, input.orderId, key, "admin_notify_email_missing");
        return "failed";
      }
      result = await service.send({
        event: "admin_new_order",
        to,
        data: { ...order.summary, customerEmail: order.email, adminUrl: `${serverConfig.appBaseUrl}${routes.adminOrder(input.orderId)}`, transactionId: order.transactionId, needsReview: order.needsReview },
      });
    } else if (input.event === "admin_payment_review") {
      const to = serverConfig.email.adminNotifyTo;
      if (!to) {
        await finish(db, input.orderId, key, "admin_notify_email_missing");
        return "failed";
      }
      result = await service.send({
        event: "admin_payment_review",
        to,
        data: { ...order.summary, customerEmail: order.email, adminUrl: `${serverConfig.appBaseUrl}${routes.adminOrder(input.orderId)}`, transactionId: order.transactionId, reason: order.reviewReason ?? "Cobro aprobado en un pedido que no estaba pendiente." },
      });
    } else {
      result = await service.send({ event: input.event, to: order.email, data: { ...order.summary, statusUrl } });
    }
    await finish(db, input.orderId, key, result.ok ? null : result.reason);
    return result.ok ? "sent" : "failed";
  } catch (error) {
    console.error(`[orders] Falló el correo "${key}": ${error instanceof Error ? error.name : "error"}.`);
    try {
      await finish(db, input.orderId, key, "exception");
    } catch {
      /* sin base de datos: la conciliación lo reintentará */
    }
    return "failed";
  }
}

/** Reintenta los correos FAILED (sin enlace privado: el token solo existe en la petición original). */
export async function retryFailedEmails(db: Database, limit = 20): Promise<number> {
  const rows = await db.execute(sql`
    select order_id, event from order_notifications
     where status = 'FAILED' and attempts < ${MAX_EMAIL_ATTEMPTS}::int and updated_at < now() - interval '2 minutes'
     order by updated_at asc limit ${limit}::int
  `);
  let sent = 0;
  for (const row of rows.rows as { order_id: string; event: string }[]) {
    const base = row.event.split(":")[0] as OrderEmailEvent;
    if ((await sendOrderEmail(db, { orderId: row.order_id, event: base, key: row.event })) === "sent") sent += 1;
  }
  return sent;
}
