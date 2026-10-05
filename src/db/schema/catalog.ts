import {
  type AnyPgColumn,
  boolean,
  char,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { productStatusEnum } from "./enums";
import { money, primaryId, timestamps } from "./common";

export const categories = pgTable(
  "categories",
  {
    id: primaryId(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    /** Categoría padre (jerarquía opcional). */
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("categories_parent_idx").on(t.parentId)],
);

/** Colecciones editoriales (lanzamientos, ediciones, temporadas…). */
export const collections = pgTable("collections", {
  id: primaryId(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const products = pgTable(
  "products",
  {
    id: primaryId(),
    slug: text("slug").notNull().unique(),
    sku: text("sku").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    shortDescription: text("short_description"),
    /** Precio de venta (entero, unidad mínima de `currency`). */
    price: money("price").notNull(),
    /**
     * COSTO — información INTERNA. Nunca debe viajar al frontend público.
     * Las consultas públicas usan `publicProductColumns` y los mapeadores de
     * `src/server/services/catalog/public.ts`, que no incluyen este campo.
     */
    cost: money("cost"),
    currency: char("currency", { length: 3 }).notNull().default("CRC"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    collectionId: uuid("collection_id").references(() => collections.id, { onDelete: "set null" }),
    status: productStatusEnum("status").notNull().default("DRAFT"),
    isFeatured: boolean("is_featured").notNull().default(false),
    isNew: boolean("is_new").notNull().default(false),
    isLimitedEdition: boolean("is_limited_edition").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    check("products_price_non_negative", sql`${t.price} >= 0`),
    check("products_cost_non_negative", sql`${t.cost} IS NULL OR ${t.cost} >= 0`),
    index("products_status_idx").on(t.status),
    index("products_category_idx").on(t.categoryId),
    index("products_collection_idx").on(t.collectionId),
  ],
);

/**
 * Variantes (talla, color, diseño, presentación…). OPCIONAL: un producto sin
 * filas aquí es un producto simple. Las opciones se guardan como pares
 * clave/valor, p. ej. {"talla": "M", "color": "Azul"}.
 */
export const productVariants = pgTable(
  "product_variants",
  {
    id: primaryId(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    name: text("name"),
    options: jsonb("options").$type<Record<string, string>>().notNull().default({}),
    /** Precio propio; NULL = usa el del producto. */
    price: money("price"),
    /** Costo propio — INTERNO, igual que `products.cost`. */
    cost: money("cost"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("product_variants_product_idx").on(t.productId),
    check("product_variants_price_non_negative", sql`${t.price} IS NULL OR ${t.price} >= 0`),
    check("product_variants_cost_non_negative", sql`${t.cost} IS NULL OR ${t.cost} >= 0`),
  ],
);

/**
 * Imágenes de producto. Solo se guarda la REFERENCIA (url / clave de
 * almacenamiento); los archivos viven en almacenamiento externo/CDN, nunca
 * dentro de PostgreSQL.
 */
export const productImages = pgTable(
  "product_images",
  {
    id: primaryId(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Si la imagen es de una variante concreta. */
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    url: text("url").notNull(),
    storageKey: text("storage_key"),
    alt: text("alt"),
    width: integer("width"),
    height: integer("height"),
    sortOrder: integer("sort_order").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("product_images_product_idx").on(t.productId),
    // A lo sumo una imagen principal por producto.
    uniqueIndex("product_images_one_primary_per_product")
      .on(t.productId)
      .where(sql`${t.isPrimary}`),
  ],
);

export type Category = typeof categories.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductVariant = typeof productVariants.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
