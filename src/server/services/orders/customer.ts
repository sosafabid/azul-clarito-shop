import "server-only";
import { sql } from "drizzle-orm";
import type { Database } from "@/db/client";

/**
 * PEDIDOS DE LA CLIENTA con sesión. Solo se leen los suyos:
 *  - los que tienen su `user_id`; y
 *  - los de invitada hechos con SU MISMO correo, únicamente si ese correo está VERIFICADO en su cuenta (así nadie ve pedidos ajenos
 *    registrándose con un correo que no controla).
 * Nunca se devuelven datos internos (costos, notas internas, alertas de revisión de pago, costo real de envío).
 */
export type CustomerOrderViewer = { userId: string; email: string; emailVerified: boolean };

export type CustomerOrderSummary = {
  orderNumber: string;
  status: string;
  currency: string;
  total: number;
  requiresShipping: boolean;
  placedAt: Date;
  itemCount: number;
  firstItemName: string | null;
};

export type CustomerOrderDetail = Omit<CustomerOrderSummary, "itemCount" | "firstItemName"> & {
  subtotal: number;
  taxTotal: number;
  shippingTotal: number;
  shippingMethodName: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  customerNotes: string | null;
  paidAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  destination: string | null;
  items: { name: string; variantOptions: Record<string, string> | null; quantity: number; unitPrice: number; lineTotal: number; digital: boolean }[];
};

const mine = (v: CustomerOrderViewer) =>
  sql`(o.user_id = ${v.userId}::uuid or (${v.emailVerified}::boolean and o.user_id is null and lower(o.email) = lower(${v.email}::text)))`;

const toDate = (v: string | Date | null) => (v ? new Date(v) : null);

export async function listCustomerOrders(db: Database, viewer: CustomerOrderViewer, limit = 50): Promise<CustomerOrderSummary[]> {
  const res = await db.execute(sql`
    select o.order_number, o.status::text as status, o.currency, o.total, o.requires_shipping, o.placed_at,
           (select coalesce(sum(i.quantity), 0)::int from order_items i where i.order_id = o.id) as item_count,
           (select i.name_snapshot from order_items i where i.order_id = o.id order by i.created_at, i.id limit 1) as first_item
      from orders o
     where ${mine(viewer)}
     order by o.placed_at desc
     limit ${limit}::int
  `);
  return (res.rows as Record<string, unknown>[]).map((r) => ({
    orderNumber: String(r.order_number),
    status: String(r.status),
    currency: String(r.currency).trim(),
    total: Number(r.total),
    requiresShipping: Boolean(r.requires_shipping),
    placedAt: new Date(r.placed_at as string),
    itemCount: Number(r.item_count),
    firstItemName: (r.first_item as string | null) ?? null,
  }));
}

export async function getCustomerOrder(db: Database, viewer: CustomerOrderViewer, orderNumber: string): Promise<CustomerOrderDetail | null> {
  if (!/^[A-Za-z0-9-]{3,40}$/.test(orderNumber)) return null;
  const res = await db.execute(sql`
    select o.id, o.order_number, o.status::text as status, o.currency, o.subtotal, o.tax_total, o.shipping_total, o.total, o.requires_shipping,
           o.shipping_method_name, o.carrier, o.tracking_number, o.tracking_url, o.customer_notes, o.placed_at, o.paid_at, o.shipped_at,
           o.delivered_at, o.cancelled_at, o.shipping_address
      from orders o
     where o.order_number = ${orderNumber}::text and ${mine(viewer)}
     limit 1
  `);
  const o = (res.rows as Record<string, unknown>[])[0];
  if (!o) return null;
  const items = await db.execute(sql`
    select name_snapshot, variant_options_snapshot, quantity, unit_price_snapshot, line_total, fulfillment_type::text as fulfillment
      from order_items where order_id = ${o.id as string}::uuid order by created_at, id
  `);
  const address = o.shipping_address as { city?: string; stateProvince?: string; district?: string | null; line1?: string } | null;
  const requiresShipping = Boolean(o.requires_shipping);
  return {
    orderNumber: String(o.order_number),
    status: String(o.status),
    currency: String(o.currency).trim(),
    total: Number(o.total),
    subtotal: Number(o.subtotal),
    taxTotal: Number(o.tax_total),
    shippingTotal: Number(o.shipping_total),
    requiresShipping,
    shippingMethodName: (o.shipping_method_name as string | null) ?? null,
    carrier: (o.carrier as string | null) ?? null,
    trackingNumber: (o.tracking_number as string | null) ?? null,
    trackingUrl: (o.tracking_url as string | null) ?? null,
    customerNotes: (o.customer_notes as string | null) ?? null,
    placedAt: new Date(o.placed_at as string),
    paidAt: toDate(o.paid_at as string | null),
    shippedAt: toDate(o.shipped_at as string | null),
    deliveredAt: toDate(o.delivered_at as string | null),
    cancelledAt: toDate(o.cancelled_at as string | null),
    destination: requiresShipping && address ? [address.line1, address.district, address.city, address.stateProvince].filter(Boolean).join(", ") : null,
    items: (items.rows as Record<string, unknown>[]).map((i) => ({
      name: String(i.name_snapshot),
      variantOptions: (i.variant_options_snapshot as Record<string, string> | null) ?? null,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unit_price_snapshot),
      lineTotal: Number(i.line_total),
      digital: i.fulfillment === "DIGITAL",
    })),
  };
}
