import { sql } from "drizzle-orm";
import { boolean, char, check, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { shippingTypeEnum } from "./enums";
import { money, primaryId, timestamps } from "./common";

/**
 * Métodos de envío (p. ej. "Entrega manual", "Retiro en persona").
 * La primera versión de shipping es MANUAL: management define los métodos y
 * las tarifas aquí, sin integración con ninguna API de transportista.
 */
export const shippingMethods = pgTable("shipping_methods", {
  id: primaryId(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  /** Transportista asociado (texto libre mientras sea manual). */
  carrier: text("carrier"),
  /** DELIVERY = entrega a domicilio · PICKUP = retiro en persona. */
  type: shippingTypeEnum("type").notNull().default("DELIVERY"),
  estimatedDaysMin: integer("estimated_days_min"),
  estimatedDaysMax: integer("estimated_days_max"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

/**
 * Tarifas por zona. Los campos de zona opcionales (provincia, ciudad, código
 * postal) permiten reglas más específicas; cuando varias tarifas coinciden se
 * aplicará la MÁS específica. NULL = "cualquiera".
 */
export const shippingRates = pgTable(
  "shipping_rates",
  {
    id: primaryId(),
    methodId: uuid("method_id")
      .notNull()
      .references(() => shippingMethods.id, { onDelete: "cascade" }),
    /** Por ahora siempre CR. NULL = cualquier país (reservado para envíos internacionales futuros). */
    countryCode: char("country_code", { length: 2 }),
    /** Nombre de la zona para el panel (GAM, Limón, Resto del país…). No afecta el cálculo. */
    zoneName: text("zone_name"),
    /** Una o varias provincias separadas por ";" (vacío = todas). */
    stateProvince: text("state_province"),
    /** Uno o varios cantones/ciudades separados por ";" (vacío = todos). */
    city: text("city"),
    postalCode: text("postal_code"),
    price: money("price").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("CRC"),
    /** Rango de monto de pedido (subtotal de productos) en que aplica la tarifa. NULL = sin límite. */
    minOrderAmount: money("min_order_amount"),
    maxOrderAmount: money("max_order_amount"),
    /** Si el subtotal llega a este monto, el envío de esta tarifa es gratis. NULL = nunca gratis. */
    freeShippingThreshold: money("free_shipping_threshold"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("shipping_rates_method_idx").on(t.methodId),
    check(
      "shipping_rates_amounts_valid",
      sql`${t.price} >= 0 AND (${t.minOrderAmount} IS NULL OR ${t.minOrderAmount} >= 0) AND (${t.maxOrderAmount} IS NULL OR ${t.maxOrderAmount} >= 0) AND (${t.minOrderAmount} IS NULL OR ${t.maxOrderAmount} IS NULL OR ${t.minOrderAmount} <= ${t.maxOrderAmount}) AND (${t.freeShippingThreshold} IS NULL OR ${t.freeShippingThreshold} >= 0)`,
    ),
  ],
);

export type ShippingMethod = typeof shippingMethods.$inferSelect;
export type ShippingRate = typeof shippingRates.$inferSelect;
