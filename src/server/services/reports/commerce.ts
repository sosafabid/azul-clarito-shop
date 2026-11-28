import "server-only";
import { sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import type { PaidOrderRow } from "@/domain/commerce-metrics";

/**
 * Lectura para el reporte comercial (SOLO servidor, solo lectura). Ventas reales = pedidos CONFIRMADOS como pagados
 * (`paid_at` lo escribe la verificación con Tilopay) que no se cancelaron ni se reembolsaron. Sin nombres, correos ni direcciones.
 */
export async function loadPaidOrders(db: Database, days: number): Promise<PaidOrderRow[]> {
  const span = Math.min(Math.max(Math.trunc(days), 1), 730);
  const orders = await db.execute(sql`
    select o.id, o.order_number, o.paid_at, o.currency, o.subtotal, o.tax_total, o.shipping_total, o.total,
           coalesce(nullif(o.shipping_address ->> 'countryCode', ''), 'CR') as country
      from orders o
     where o.paid_at is not null
       and o.status::text in ('PAID', 'PREPARING', 'PACKED', 'SHIPPED', 'DELIVERED')
       and o.paid_at >= now() - (${span}::int * interval '1 day')
     order by o.paid_at desc
  `);
  const rows = orders.rows as Record<string, unknown>[];
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id as string);
  const items = await db.execute(sql`
    select i.order_id, coalesce(i.product_id::text, i.sku_snapshot) as product_key, i.name_snapshot, i.quantity, i.line_total
      from order_items i
     where i.order_id in (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)})
  `);
  const byOrder = new Map<string, PaidOrderRow["items"]>();
  for (const item of items.rows as Record<string, unknown>[]) {
    const list = byOrder.get(item.order_id as string) ?? [];
    list.push({ productKey: item.product_key as string, name: item.name_snapshot as string, quantity: Number(item.quantity), lineTotal: Number(item.line_total) });
    byOrder.set(item.order_id as string, list);
  }
  return rows.map((row) => ({
    orderNumber: row.order_number as string,
    paidAt: new Date(row.paid_at as string),
    currency: (row.currency as string).trim(),
    subtotal: Number(row.subtotal),
    taxTotal: Number(row.tax_total),
    shippingTotal: Number(row.shipping_total),
    total: Number(row.total),
    country: row.country as string,
    items: byOrder.get(row.id as string) ?? [],
  }));
}

export type CatalogSnapshot = { activeProducts: number; physicalOutOfStock: number };

/** Productos activos y cuántos productos físicos activos no tienen unidades disponibles. */
export async function loadCatalogSnapshot(db: Database): Promise<CatalogSnapshot> {
  const res = await db.execute(sql`
    select count(*)::int as active,
           count(*) filter (
             where p.product_type::text = 'PHYSICAL'
               and coalesce((select sum(inv.available_stock) from inventory inv where inv.product_id = p.id), 0) <= 0
           )::int as out_of_stock
      from products p
     where p.status::text = 'ACTIVE'
  `);
  const row = (res.rows as Record<string, unknown>[])[0] ?? {};
  return { activeProducts: Number(row.active ?? 0), physicalOutOfStock: Number(row.out_of_stock ?? 0) };
}
