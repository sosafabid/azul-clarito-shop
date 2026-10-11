import "server-only";
import { asc, desc, eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { inventoryReservations, orderItems, orderNotifications, orders, paymentEvents, payments } from "@/db/schema";
import { assertOrderTransition, type OrderStatus } from "@/domain/order-status";
import { toAuditRow, type AuditActor } from "@/server/services/audit";

/**
 * PEDIDOS PARA EL PANEL (SUPER_ADMIN y STAFF). Solo lectura, salvo el seguimiento del envío manual.
 * Nunca se selecciona el costo ni la utilidad (`unit_cost_snapshot`): eso es información económica interna.
 */
export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  placedAt: Date;
  customerName: string | null;
  email: string;
  total: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: string | null;
  needsReview: boolean;
};

export async function listAdminOrders(db: Database, limit = 100): Promise<AdminOrderRow[]> {
  const rows = await db.execute(sql`
    select o.id, o.order_number, o.placed_at, o.customer_name, o.email, o.total, o.currency, o.status,
           (select p.status from payments p where p.order_id = o.id order by (p.status = 'PAID') desc, p.attempt desc limit 1) as payment_status,
           (o.payment_review_reason is not null) as needs_review
      from orders o order by o.placed_at desc limit ${limit}::int
  `);
  return (rows.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    orderNumber: String(r.order_number),
    placedAt: new Date(String(r.placed_at)),
    customerName: (r.customer_name as string | null) ?? null,
    email: String(r.email),
    total: Number(r.total),
    currency: String(r.currency).trim(),
    status: r.status as OrderStatus,
    paymentStatus: (r.payment_status as string | null) ?? null,
    needsReview: r.needs_review === true || r.needs_review === "t",
  }));
}

export async function getAdminOrder(db: Database, id: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return null;
  const [items, paymentRows, events, reservations, notifications] = await Promise.all([
    db
      .select({ id: orderItems.id, name: orderItems.nameSnapshot, sku: orderItems.skuSnapshot, quantity: orderItems.quantity, unitPrice: orderItems.unitPriceSnapshot, lineTotal: orderItems.lineTotal })
      .from(orderItems)
      .where(eq(orderItems.orderId, id))
      .orderBy(asc(orderItems.createdAt)),
    db.select().from(payments).where(eq(payments.orderId, id)).orderBy(asc(payments.attempt)),
    db.select().from(paymentEvents).where(eq(paymentEvents.orderId, id)).orderBy(desc(paymentEvents.createdAt)).limit(100),
    db.select().from(inventoryReservations).where(eq(inventoryReservations.orderId, id)),
    db.select().from(orderNotifications).where(eq(orderNotifications.orderId, id)).orderBy(asc(orderNotifications.createdAt)),
  ]);
  return { order, items, payments: paymentRows, events, reservations, notifications };
}

export type FulfillmentInput = { next: OrderStatus; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null };

export const FULFILLMENT_TARGETS = ["PREPARING", "PACKED", "SHIPPED", "DELIVERED"] as const satisfies readonly OrderStatus[];

/**
 * Avanza el envío MANUAL (pagado → preparando → empacado → enviado → entregado) y anota courier / seguimiento.
 * Una sola sentencia: solo se aplica si el pedido sigue en el estado que la persona vio (`expected`) y deja su auditoría.
 * Un pedido que no está pagado (pendiente/cancelado) NUNCA pasa a preparación: el estado PAID solo lo pone la verificación del pago.
 */
export async function advanceFulfillment(
  db: Database,
  input: { orderId: string; expected: OrderStatus; actor: AuditActor } & FulfillmentInput,
): Promise<boolean> {
  assertOrderTransition(input.expected, input.next);
  const audit = toAuditRow(input.actor, { action: "order_fulfillment_updated", entityType: "order", entityId: input.orderId, metadata: { from: input.expected, to: input.next, hasTracking: Boolean(input.trackingNumber) } });
  const result = await db.execute(sql`
    with upd as (
      update orders
         set status = ${input.next}::order_status,
             carrier = coalesce(${input.carrier}::text, carrier),
             tracking_number = coalesce(${input.trackingNumber}::text, tracking_number),
             tracking_url = coalesce(${input.trackingUrl}::text, tracking_url),
             shipped_at = case when ${input.next} = 'SHIPPED' then now() else shipped_at end,
             delivered_at = case when ${input.next} = 'DELIVERED' then now() else delivered_at end,
             updated_at = now()
       where id = ${input.orderId}::uuid and status = ${input.expected}::order_status
      returning id
    )
    insert into audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    select ${audit.actorUserId ?? null}::uuid, ${audit.action}::text, ${audit.entityType}::text, ${audit.entityId ?? null}::text, ${JSON.stringify(audit.metadata)}::jsonb from upd
    returning id
  `);
  return result.rows.length > 0;
}
