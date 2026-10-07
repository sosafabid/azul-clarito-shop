import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { categories, products } from "./catalog";
import { primaryId, timestamps } from "./common";
import { taxRoundingEnum, taxRuleScopeEnum, taxTreatmentEnum } from "./enums";

/**
 * Impuesto de la tienda (p. ej. IVA). Primera versión: UNA tasa activa a la vez (índice parcial).
 * No hay ninguna tasa precargada: la define quien administra, en el panel.
 *
 *  - `rate_bps`: tasa en puntos básicos (13 % = 1300).
 *  - `prices_include_tax`: true = los precios publicados YA incluyen el impuesto; false = se suma al pagar.
 *  - `rounding`: cómo se redondea el impuesto de cada línea.
 */
export const taxRates = pgTable(
  "tax_rates",
  {
    id: primaryId(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    rateBps: integer("rate_bps").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    pricesIncludeTax: boolean("prices_include_tax").notNull(),
    rounding: taxRoundingEnum("rounding").notNull().default("HALF_UP"),
    ...timestamps,
  },
  (t) => [
    check("tax_rates_rate_range", sql`${t.rateBps} BETWEEN 0 AND 10000`),
    uniqueIndex("tax_rates_one_active").on(t.isActive).where(sql`${t.isActive}`),
  ],
);

/**
 * Qué está sujeto o exento. Gana la regla más específica: producto > categoría > todos.
 * Sin ninguna regla aplicable, el producto NO paga impuesto.
 */
export const taxRules = pgTable(
  "tax_rules",
  {
    id: primaryId(),
    taxRateId: uuid("tax_rate_id")
      .notNull()
      .references(() => taxRates.id, { onDelete: "cascade" }),
    scope: taxRuleScopeEnum("scope").notNull(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    treatment: taxTreatmentEnum("treatment").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "tax_rules_scope_target",
      sql`(${t.scope} = 'ALL' AND ${t.categoryId} IS NULL AND ${t.productId} IS NULL) OR (${t.scope} = 'CATEGORY' AND ${t.categoryId} IS NOT NULL AND ${t.productId} IS NULL) OR (${t.scope} = 'PRODUCT' AND ${t.productId} IS NOT NULL AND ${t.categoryId} IS NULL)`,
    ),
    uniqueIndex("tax_rules_all_unique").on(t.taxRateId).where(sql`${t.scope} = 'ALL'`),
    uniqueIndex("tax_rules_category_unique").on(t.taxRateId, t.categoryId).where(sql`${t.scope} = 'CATEGORY'`),
    uniqueIndex("tax_rules_product_unique").on(t.taxRateId, t.productId).where(sql`${t.scope} = 'PRODUCT'`),
    index("tax_rules_rate_idx").on(t.taxRateId),
  ],
);

export type TaxRate = typeof taxRates.$inferSelect;
export type TaxRule = typeof taxRules.$inferSelect;
