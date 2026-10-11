import "server-only";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { toOrderAmounts, type PricingSnapshot } from "@/domain/checkout";
import type { CurrencyCode } from "@/domain/money";
import { formatOrderNumber } from "@/domain/order-number";
import { RESERVATION_MINUTES } from "@/domain/tilopay";
import { pgConstraint, pgErrorCode } from "@/server/db-errors";
import type { AddressSnapshot } from "@/types/address";

/**
 * CREAR EL PEDIDO PENDIENTE (con reserva de stock) — UNA sola sentencia SQL, todo o nada.
 *
 * El driver HTTP de Neon no permite transacciones interactivas, así que la atomicidad sale de que todo ocurre en UNA
 * sentencia con CTEs de modificación: si cualquier parte falla, PostgreSQL revierte la sentencia completa.
 *
 *   1. `priced`  vuelve a comprobar contra la base que cada producto/variante sigue ACTIVO y con el MISMO precio con el que
 *                se calculó el total (si cambió mientras la clienta llenaba el formulario, no se crea nada).
 *   2. `upd`     mueve las unidades de available_stock a reserved_stock. Los CHECK (`available_stock >= 0`) son la barrera
 *                final contra la sobreventa: si DOS clientas piden la última unidad a la vez, una de las dos sentencias falla
 *                entera (PostgreSQL serializa las escrituras de la misma fila) y no deja NADA a medias.
 *   3. `chk`     aborta si no se reservaron TODAS las líneas.
 *   4. orden + líneas (copia histórica de nombre, SKU, precio, costo, imagen) + reservas con vencimiento + intento de pago #1.
 *
 * Los montos (`toOrderAmounts`) salen del snapshot calculado en el servidor, nunca del navegador.
 */
export type OrderLineInput = {
  inventoryId: string;
  productId: string;
  variantId: string | null;
  name: string;
  sku: string;
  imageUrl: string | null;
  variantOptions: Record<string, string> | null;
  unitPrice: number;
  quantity: number;
};

export type CreatePendingOrderInput = {
  userId: string | null;
  cartId: string;
  customer: { name: string; email: string; phone: string };
  address: AddressSnapshot;
  notes: string | null;
  snapshot: PricingSnapshot;
  currency: CurrencyCode;
  lines: readonly OrderLineInput[];
};

export type CreatePendingOrderResult =
  | { ok: true; orderId: string; orderNumber: string; paymentId: string; providerOrderNumber: string; total: number; reservedUntil: Date }
  | { ok: false; code: "insufficient_stock" | "changed" | "pending_exists" | "error" };

async function nextOrderNumber(db: Database): Promise<string> {
  const result = await db.execute(sql`select nextval('order_number_seq')::bigint as n`);
  const row = result.rows[0] as { n?: string | number } | undefined;
  return formatOrderNumber(Number(row?.n));
}

export async function createPendingOrder(db: Database, input: CreatePendingOrderInput): Promise<CreatePendingOrderResult> {
  const { snapshot } = input;
  const amounts = toOrderAmounts(snapshot);
  const n = input.lines.length;
  if (n === 0) return { ok: false, code: "error" };

  const orderNumber = await nextOrderNumber(db);
  const orderId = randomUUID();
  const paymentId = randomUUID();
  const providerOrderNumber = orderNumber; // intento 1
  const rows = sql.join(
    input.lines.map(
      (l) =>
        sql`(${l.inventoryId}::uuid, ${l.productId}::uuid, ${l.variantId}::uuid, ${l.unitPrice}::bigint, ${l.quantity}::int, ${l.name}::text, ${l.sku}::text, ${l.imageUrl}::text, ${l.variantOptions ? JSON.stringify(l.variantOptions) : null}::jsonb)`,
    ),
    sql`, `,
  );
  const shippingMethodName = snapshot.shipping.name;
  const eventDetail = JSON.stringify({ total: amounts.total, currency: input.currency, lines: n });

  try {
    const result = await db.execute(sql`
      with lines as (
        select * from (values ${rows}) as l(inventory_id, product_id, variant_id, price, qty, name, sku, image_url, options)
      ),
      priced as (
        select count(*)::int as ok
          from lines l
          join products p on p.id = l.product_id and p.status = 'ACTIVE'
          left join product_variants v on v.id = l.variant_id
         where coalesce(v.price, p.price) = l.price
           and (l.variant_id is null or (v.id is not null and v.is_active and v.product_id = p.id))
      ),
      upd as (
        update inventory i
           set available_stock = i.available_stock - l.qty,
               reserved_stock = i.reserved_stock + l.qty,
               updated_at = now()
          from lines l
         where i.id = l.inventory_id
        returning i.id
      ),
      chk as materialized (
        select 1 / (case when (select ok from priced) = ${n} and (select count(*) from upd) = ${n} then 1 else 0 end) as x
      ),
      ord as (
        insert into orders (id, order_number, user_id, cart_id, email, customer_name, customer_phone, status, currency,
                            subtotal, shipping_total, tax_total, total, shipping_method_id, shipping_method_name,
                            shipping_address, billing_address, pricing_snapshot, customer_notes)
        select ${orderId}::uuid, ${orderNumber}::text, ${input.userId}::uuid, ${input.cartId}::uuid, ${input.customer.email}::text,
               ${input.customer.name}::text, ${input.customer.phone}::text, 'PENDING', ${input.currency}::text,
               ${amounts.subtotal}::bigint * chk.x, ${amounts.shippingTotal}::bigint, ${amounts.taxTotal}::bigint, ${amounts.total}::bigint,
               ${snapshot.shipping.methodId}::uuid, ${shippingMethodName}::text,
               ${JSON.stringify(input.address)}::jsonb, ${JSON.stringify(input.address)}::jsonb, ${JSON.stringify(snapshot)}::jsonb, ${input.notes}::text
          from chk
        returning id
      ),
      items as (
        insert into order_items (order_id, product_id, variant_id, name_snapshot, sku_snapshot, variant_options_snapshot,
                                 image_url_snapshot, unit_price_snapshot, unit_cost_snapshot, quantity, line_total)
        select ${orderId}::uuid, l.product_id, l.variant_id, l.name, l.sku, l.options, l.image_url, l.price,
               coalesce(v.cost, p.cost), l.qty, l.price * l.qty
          from lines l
          join products p on p.id = l.product_id
          left join product_variants v on v.id = l.variant_id
        returning id
      ),
      res as (
        insert into inventory_reservations (order_id, inventory_id, quantity, expires_at)
        select ${orderId}::uuid, l.inventory_id, l.qty, now() + make_interval(mins => ${RESERVATION_MINUTES}::int)
          from lines l
        returning expires_at
      ),
      pay as (
        insert into payments (id, order_id, provider, status, amount, currency, attempt, provider_order_number, return_token_hash, method)
        select ${paymentId}::uuid, ${orderId}::uuid, 'tilopay', 'PENDING', ${amounts.total}::bigint, ${input.currency}::text, 1,
               ${providerOrderNumber}::text, null::text, 'card'
          from ord
        returning id
      ),
      ev as (
        insert into payment_events (order_id, payment_id, source, type, detail)
        select ${orderId}::uuid, ${paymentId}::uuid, 'checkout', 'order_created', ${eventDetail}::jsonb from ord
        returning id
      )
      select (select count(*) from items)::int as items, (select max(expires_at) from res) as reserved_until
    `);
    const row = result.rows[0] as { items?: number; reserved_until?: string | Date } | undefined;
    if (!row || Number(row.items) !== n) return { ok: false, code: "error" };
    return { ok: true, orderId, orderNumber, paymentId, providerOrderNumber, total: amounts.total, reservedUntil: new Date(String(row.reserved_until)) };
  } catch (error) {
    const code = pgErrorCode(error);
    const constraint = pgConstraint(error);
    if (code === "23514" && /inventory_available_non_negative/.test(constraint ?? "")) return { ok: false, code: "insufficient_stock" };
    if (code === "22012") return { ok: false, code: "changed" };
    if (code === "23505" && /orders_one_pending_per_cart/.test(constraint ?? "")) return { ok: false, code: "pending_exists" };
    console.error(`[checkout] No se pudo crear el pedido pendiente (SQLSTATE ${code ?? "desconocido"}).`);
    return { ok: false, code: "error" };
  }
}
