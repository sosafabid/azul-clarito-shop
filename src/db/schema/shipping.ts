import { boolean, char, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
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
    countryCode: char("country_code", { length: 2 }).notNull().default("CR"),
    stateProvince: text("state_province"),
    city: text("city"),
    postalCode: text("postal_code"),
    price: money("price").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("CRC"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("shipping_rates_method_idx").on(t.methodId)],
);

export type ShippingMethod = typeof shippingMethods.$inferSelect;
export type ShippingRate = typeof shippingRates.$inferSelect;
