import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { categories, productImages, productVariants, products } from "@/db/schema";
import { stockState } from "@/domain/inventory-view";
import type {
  ProductAvailability,
  PublicProductDetail,
  PublicProductListItem,
  PublicVariantItem,
} from "@/types/catalog";
import { publicImageColumns, publicProductColumns, toPublicImage, toPublicProduct } from "./public";

/**
 * CONSULTAS PÚBLICAS del catálogo (lo que ve cualquier visitante).
 *
 * Reglas:
 *  - Solo productos ACTIVOS.
 *  - Los datos de producto salen de `publicProductColumns`: el costo nunca se
 *    selecciona. Este archivo no debe mencionar ni leer columnas de costo.
 *  - La disponibilidad se calcula aquí y solo se devuelve el ESTADO
 *    (en stock / pocas unidades / agotado), no las cantidades.
 */
const AVAILABLE_SQL = sql<number>`coalesce((select sum(i.available_stock) from inventory i left join product_variants pv on pv.id = i.variant_id where i.product_id = ${products.id} and (i.variant_id is null or pv.is_active)), 0)`.mapWith(
  Number,
);
const THRESHOLD_SQL = sql<number>`coalesce((select max(i.low_stock_threshold) from inventory i where i.product_id = ${products.id}), 0)`.mapWith(
  Number,
);
const PRIMARY_IMAGE_URL = sql<string | null>`(select pi.url from product_images pi where pi.product_id = ${products.id} order by pi.is_primary desc, pi.sort_order asc, pi.created_at asc limit 1)`;
const PRIMARY_IMAGE_ALT = sql<string | null>`(select pi.alt from product_images pi where pi.product_id = ${products.id} order by pi.is_primary desc, pi.sort_order asc, pi.created_at asc limit 1)`;

export function toAvailability(availableStock: number, lowStockThreshold: number): ProductAvailability {
  const state = stockState(availableStock, lowStockThreshold);
  return state === "out" ? "out_of_stock" : state === "low" ? "low_stock" : "in_stock";
}

const listColumns = {
  ...publicProductColumns,
  categoryName: categories.name,
  imageUrl: PRIMARY_IMAGE_URL,
  imageAlt: PRIMARY_IMAGE_ALT,
  availableStock: AVAILABLE_SQL,
  lowStockThreshold: THRESHOLD_SQL,
} as const;

type ListRow = Parameters<typeof toPublicProduct>[0] & {
  categoryName: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  availableStock: number;
  lowStockThreshold: number;
};

function toListItem(row: ListRow): PublicProductListItem {
  return {
    ...toPublicProduct(row),
    categoryName: row.categoryName,
    imageUrl: row.imageUrl,
    imageAlt: row.imageAlt,
    availability: toAvailability(row.availableStock, row.lowStockThreshold),
  };
}

export async function listPublicProducts(db: Database): Promise<PublicProductListItem[]> {
  const rows = await db
    .select(listColumns)
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(eq(products.status, "ACTIVE"))
    .orderBy(desc(products.isFeatured), desc(products.createdAt));
  return rows.map(toListItem);
}

export async function getPublicProductBySlug(db: Database, slug: string): Promise<PublicProductDetail | null> {
  const [row] = await db
    .select(listColumns)
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.slug, slug), eq(products.status, "ACTIVE")))
    .limit(1);
  if (!row) return null;

  const images = await db
    .select(publicImageColumns)
    .from(productImages)
    .where(eq(productImages.productId, row.id))
    .orderBy(desc(productImages.isPrimary), asc(productImages.sortOrder), asc(productImages.createdAt));

  const variantRows = await db
    .select({
      id: productVariants.id,
      name: productVariants.name,
      options: productVariants.options,
      price: productVariants.price,
      availableStock: sql<number>`coalesce((select sum(i.available_stock) from inventory i where i.variant_id = ${productVariants.id}), 0)`.mapWith(Number),
      lowStockThreshold: sql<number>`coalesce((select max(i.low_stock_threshold) from inventory i where i.variant_id = ${productVariants.id}), 0)`.mapWith(Number),
    })
    .from(productVariants)
    .where(and(eq(productVariants.productId, row.id), eq(productVariants.isActive, true)))
    .orderBy(asc(productVariants.sortOrder), asc(productVariants.createdAt));

  const variants: PublicVariantItem[] = variantRows.map((variant) => ({
    id: variant.id,
    name: variant.name,
    options: variant.options,
    price: variant.price,
    availability: toAvailability(variant.availableStock, variant.lowStockThreshold),
  }));

  return { ...toListItem(row), images: images.map(toPublicImage), variants };
}
