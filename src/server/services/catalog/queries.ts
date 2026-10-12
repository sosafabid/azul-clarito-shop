import "server-only";
import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { Database } from "@/db/client";
import { isDigitalStorageConfigured } from "@/server/services/digital/storage";
import { releaseExpiredReservations } from "@/server/services/payments/reconcile";
import { categories, collections, productCollections, productImages, productVariants, products } from "@/db/schema";
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
const AVAILABLE_SQL = sql<number>`case when ${products.productType} = 'DIGITAL' then (case when ${sql.raw(isDigitalStorageConfigured() ? "true" : "false")} and exists (select 1 from digital_assets da where da.product_id = ${products.id} and da.is_active) then 1 else 0 end) else coalesce((select sum(i.available_stock) from inventory i left join product_variants pv on pv.id = i.variant_id where i.product_id = ${products.id} and (i.variant_id is null or pv.is_active)), 0) end`.mapWith(
  Number,
);
const THRESHOLD_SQL = sql<number>`coalesce((select max(i.low_stock_threshold) from inventory i where i.product_id = ${products.id}), 0)`.mapWith(
  Number,
);
const HAS_VARIANTS_SQL = sql<boolean>`exists (select 1 from product_variants pv where pv.product_id = ${products.id} and pv.is_active)`;
const PRIMARY_IMAGE_URL = sql<string | null>`(select pi.url from product_images pi where pi.product_id = ${products.id} order by pi.is_primary desc, pi.sort_order asc, pi.created_at asc limit 1)`;
const PRIMARY_IMAGE_ALT = sql<string | null>`(select pi.alt from product_images pi where pi.product_id = ${products.id} order by pi.is_primary desc, pi.sort_order asc, pi.created_at asc limit 1)`;

export function toAvailability(availableStock: number, lowStockThreshold: number): ProductAvailability {
  const state = stockState(availableStock, lowStockThreshold);
  return state === "out" ? "out_of_stock" : state === "low" ? "low_stock" : "in_stock";
}

const listColumns = {
  ...publicProductColumns,
  categoryName: categories.name,
  categorySlug: categories.slug,
  imageUrl: PRIMARY_IMAGE_URL,
  imageAlt: PRIMARY_IMAGE_ALT,
  availableStock: AVAILABLE_SQL,
  lowStockThreshold: THRESHOLD_SQL,
  hasVariants: HAS_VARIANTS_SQL,
} as const;

type ListRow = Parameters<typeof toPublicProduct>[0] & {
  categoryName: string | null;
  categorySlug: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  availableStock: number;
  lowStockThreshold: number;
  hasVariants: boolean;
};

function toListItem(row: ListRow, collectionsOf: ReadonlyMap<string, PublicProductListItem["collections"]> = new Map()): PublicProductListItem {
  return {
    ...toPublicProduct(row),
    categoryName: row.categoryName,
    categorySlug: row.categorySlug,
    collections: collectionsOf.get(row.id) ?? [],
    imageUrl: row.imageUrl,
    imageAlt: row.imageAlt,
    availability: toAvailability(row.availableStock, row.lowStockThreshold),
    hasVariants: row.hasVariants,
  };
}

/** Colecciones ACTIVAS de cada producto (un producto puede estar en varias). */
async function loadCollectionsOf(db: Database, productIds: readonly string[]): Promise<Map<string, PublicProductListItem["collections"]>> {
  const map = new Map<string, PublicProductListItem["collections"]>();
  if (productIds.length === 0) return map;
  const rows = await db
    .select({ productId: productCollections.productId, id: collections.id, slug: collections.slug, name: collections.name })
    .from(productCollections)
    .innerJoin(collections, eq(collections.id, productCollections.collectionId))
    .where(and(inArray(productCollections.productId, [...productIds]), eq(collections.isActive, true)))
    .orderBy(asc(collections.sortOrder), asc(collections.name));
  for (const row of rows) map.set(row.productId, [...(map.get(row.productId) ?? []), { id: row.id, slug: row.slug, name: row.name }]);
  return map;
}

export type CatalogFilter = { categorySlug?: string | null; collectionSlug?: string | null };

/**
 * Productos ACTIVOS, opcionalmente filtrados por categoría y/o colección (se combinan con AND).
 * El filtro se aplica en la base de datos con los slugs ya validados; una categoría/colección inactiva no filtra nada visible.
 */
export async function listPublicProducts(db: Database, filter: CatalogFilter = {}): Promise<PublicProductListItem[]> {
  await releaseExpiredReservations(db);
  const conditions: SQL[] = [eq(products.status, "ACTIVE")];
  if (filter.categorySlug) conditions.push(eq(categories.slug, filter.categorySlug), eq(categories.isActive, true));
  if (filter.collectionSlug) {
    conditions.push(
      sql`exists (select 1 from product_collections pc join collections co on co.id = pc.collection_id where pc.product_id = ${products.id} and co.slug = ${filter.collectionSlug} and co.is_active)`,
    );
  }
  const rows = await db
    .select(listColumns)
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(...conditions))
    .orderBy(desc(products.isFeatured), desc(products.createdAt));
  const collectionsOf = await loadCollectionsOf(db, rows.map((row) => row.id));
  return rows.map((row) => toListItem(row, collectionsOf));
}

export async function getPublicProductBySlug(db: Database, slug: string): Promise<PublicProductDetail | null> {
  await releaseExpiredReservations(db);
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

  const collectionsOf = await loadCollectionsOf(db, [row.id]);
  return { ...toListItem(row, collectionsOf), images: images.map(toPublicImage), variants };
}
