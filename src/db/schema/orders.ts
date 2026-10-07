import {
  char,
  check,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { PricingSnapshot } from "@/domain/checkout";
import type { AddressSnapshot } from "@/types/address";
import { orderStatusEnum } from "./enums";
import { users } from "./users";
import { products, productVariants } from "./catalog";
import { shippingMethods } from "./shipping";
import { money, primaryId, timestamps } from "./common";

/** Consecutivo de números de pedido (ver `src/domain/order-number.ts`). */
export const orderNumberSeq = pgSequence("order_number_seq", { startWith: 1, increment: 1 });

export const orders = pgTable(
  "orders",
  {
    id: primaryId(),
    /** Número legible, p. ej. "AC-2026-000123". */
    orderNumber: text("order_number").notNull().unique(),
    /** NULL = compra como invitada (sin cuenta). */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),

    status: orderStatusEnum("status").notNull().default("PENDING"),
    currency: char("currency", { length: 3 }).notNull().default("CRC"),

    subtotal: money("subtotal").notNull(),
    shippingTotal: money("shipping_total").notNull().default(0),
    /** Impuestos: 0 hasta que se defina si aplican. */
    taxTotal: money("tax_total").notNull().default(0),
    total: money("total").notNull(),

    shippingMethodId: uuid("shipping_method_id").references(() => shippingMethods.id, {
      onDelete: "set null",
    }),
    /** Copia del nombre del método al momento de la compra. */
    shippingMethodName: text("shipping_method_name"),
    /** Snapshots: la dirección queda congelada en el pedido. */
    shippingAddress: jsonb("shipping_address").$type<AddressSnapshot>().notNull(),
    billingAddress: jsonb("billing_address").$type<AddressSnapshot>(),
    /**
     * Cálculo COMPLETO congelado al crear el pedido: moneda, subtotal, impuesto (nombre, tasa usada,
     * si estaba incluido, redondeo), método y tarifa de envío, destino y total. Si mañana cambia una tarifa
     * o la tasa, este pedido NO cambia. Pedidos anteriores a esta columna: NULL.
     */
    pricingSnapshot: jsonb("pricing_snapshot").$type<PricingSnapshot>(),

    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url"),

    /** Nota de la clienta (visible para ella). */
    customerNotes: text("customer_notes"),
    /** Nota interna de management (NUNCA visible para la clienta). */
    internalNotes: text("internal_notes"),

    placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check(
      "orders_amounts_non_negative",
      sql`${t.subtotal} >= 0 AND ${t.shippingTotal} >= 0 AND ${t.taxTotal} >= 0 AND ${t.total} >= 0`,
    ),
    check("orders_total_matches_parts", sql`${t.total} = ${t.subtotal} + ${t.shippingTotal} + ${t.taxTotal}`),
    index("orders_user_idx").on(t.userId),
    index("orders_status_idx").on(t.status),
    index("orders_email_idx").on(t.email),
    index("orders_placed_at_idx").on(t.placedAt),
  ],
);

/**
 * Líneas del pedido.
 *
 * SNAPSHOT: nombre, SKU, precio y costo se COPIAN al crear el pedido. Si el
 * producto cuesta ₡12.000 hoy y mañana ₡15.000, este pedido conserva ₡12.000.
 * `product_id` / `variant_id` son solo referencias de trazabilidad (pasan a
 * NULL si algún día se borra el producto; la línea sigue siendo válida).
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: primaryId(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),

    nameSnapshot: text("name_snapshot").notNull(),
    skuSnapshot: text("sku_snapshot").notNull(),
    variantOptionsSnapshot: jsonb("variant_options_snapshot").$type<Record<string, string>>(),
    imageUrlSnapshot: text("image_url_snapshot"),

    /** Precio unitario AL MOMENTO de la compra. */
    unitPriceSnapshot: money("unit_price_snapshot").notNull(),
    /** Costo unitario al momento de la compra — INTERNO (reportes de margen). */
    unitCostSnapshot: money("unit_cost_snapshot"),
    quantity: integer("quantity").notNull(),
    lineTotal: money("line_total").notNull(),
    ...timestamps,
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
    check("order_items_price_non_negative", sql`${t.unitPriceSnapshot} >= 0`),
    check("order_items_line_total_matches", sql`${t.lineTotal} = ${t.unitPriceSnapshot} * ${t.quantity}`),
  ],
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
