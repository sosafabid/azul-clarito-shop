import { check, index, integer, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { productVariants, products } from "./catalog";
import { primaryId } from "./common";

/**
 * Inventario por unidad vendible:
 *   - producto simple          → una fila con `variant_id` NULL
 *   - producto con variantes   → una fila por variante
 *
 * Semántica (ver `src/domain/stock.ts`):
 *   available_stock : se puede vender ahora
 *   reserved_stock  : retenido por checkouts en curso
 *   sold_stock      : vendido (acumulado)
 *
 * Los CHECK impiden stock negativo incluso si hay un bug en la aplicación.
 */
export const inventory = pgTable(
  "inventory",
  {
    id: primaryId(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
    availableStock: integer("available_stock").notNull().default(0),
    reservedStock: integer("reserved_stock").notNull().default(0),
    soldStock: integer("sold_stock").notNull().default(0),
    /** Avisar en el panel cuando `available_stock` baje de este número. */
    lowStockThreshold: integer("low_stock_threshold").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check("inventory_available_non_negative", sql`${t.availableStock} >= 0`),
    check("inventory_reserved_non_negative", sql`${t.reservedStock} >= 0`),
    check("inventory_sold_non_negative", sql`${t.soldStock} >= 0`),
    index("inventory_product_idx").on(t.productId),
    // Una fila por producto simple…
    uniqueIndex("inventory_one_row_per_simple_product")
      .on(t.productId)
      .where(sql`${t.variantId} IS NULL`),
    // …y una fila por variante.
    uniqueIndex("inventory_one_row_per_variant")
      .on(t.variantId)
      .where(sql`${t.variantId} IS NOT NULL`),
  ],
);

export type InventoryRow = typeof inventory.$inferSelect;
