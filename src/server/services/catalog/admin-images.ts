import "server-only";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { Database } from "@/db/client";
import { productImages, products } from "@/db/schema";
import { MAX_IMAGES_PER_PRODUCT } from "@/domain/images";
import { isUuid } from "@/domain/ids";
import { auditInsert, type AuditActor } from "@/server/services/audit";
import type { ImageRef } from "./admin";

/** Imágenes de un producto (solo la REFERENCIA; los archivos están en almacenamiento externo). */
export type AdminImage = {
  id: string;
  url: string;
  storageKey: string | null;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export async function listProductImages(db: Database, productId: string): Promise<AdminImage[]> {
  return db
    .select({
      id: productImages.id,
      url: productImages.url,
      storageKey: productImages.storageKey,
      alt: productImages.alt,
      sortOrder: productImages.sortOrder,
      isPrimary: productImages.isPrimary,
    })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(desc(productImages.isPrimary), asc(productImages.sortOrder), asc(productImages.createdAt));
}

export type ImageResult =
  | { ok: true; removed?: { url: string; storageKey: string | null } }
  | { ok: false; message: string };

async function productInfo(db: Database, productId: string) {
  if (!isUuid(productId)) return null;
  const [row] = await db.select({ id: products.id, name: products.name, sku: products.sku }).from(products).where(eq(products.id, productId)).limit(1);
  return row ?? null;
}

export async function addProductImages(db: Database, productId: string, images: readonly ImageRef[], actor: AuditActor): Promise<ImageResult> {
  const product = await productInfo(db, productId);
  if (!product) return { ok: false, message: "Producto no encontrado." };
  if (images.length === 0) return { ok: false, message: "No se recibió ninguna imagen." };

  const [stats] = await db
    .select({ n: count(), maxOrder: sql<number>`coalesce(max(${productImages.sortOrder}), -1)`.mapWith(Number) })
    .from(productImages)
    .where(eq(productImages.productId, productId));
  const existing = stats?.n ?? 0;
  if (existing + images.length > MAX_IMAGES_PER_PRODUCT) {
    return { ok: false, message: `Un producto admite hasta ${MAX_IMAGES_PER_PRODUCT} imágenes (ya tiene ${existing}).` };
  }

  await db.batch([
    db.insert(productImages).values(
      images.map((image, index) => ({
        productId,
        url: image.url,
        storageKey: image.storageKey ?? null,
        alt: product.name,
        sortOrder: (stats?.maxOrder ?? -1) + 1 + index,
        isPrimary: existing === 0 && index === 0,
      })),
    ),
    auditInsert(db, actor, [
      { action: "product.image_added", entityType: "product", entityId: productId, metadata: { count: images.length, productName: product.name, sku: product.sku } },
    ]),
  ]);
  return { ok: true };
}

async function loadImage(db: Database, imageId: string) {
  if (!isUuid(imageId)) return null;
  const [row] = await db
    .select({ id: productImages.id, productId: productImages.productId, url: productImages.url, storageKey: productImages.storageKey, isPrimary: productImages.isPrimary })
    .from(productImages)
    .where(eq(productImages.id, imageId))
    .limit(1);
  return row ?? null;
}

export async function removeProductImage(db: Database, imageId: string, actor: AuditActor): Promise<ImageResult> {
  const image = await loadImage(db, imageId);
  if (!image) return { ok: false, message: "Imagen no encontrada." };
  const product = await productInfo(db, image.productId);

  const statements: [BatchItem<"pg">, ...BatchItem<"pg">[]] = [db.delete(productImages).where(eq(productImages.id, imageId))];
  if (image.isPrimary) {
    // Si se borra la principal, la siguiente (por orden) pasa a ser la principal.
    statements.push(
      db
        .update(productImages)
        .set({ isPrimary: true })
        .where(
          eq(
            productImages.id,
            sql`(select id from product_images where product_id = ${image.productId} order by sort_order asc, created_at asc limit 1)`,
          ),
        ),
    );
  }
  statements.push(
    auditInsert(db, actor, [
      { action: "product.image_removed", entityType: "product", entityId: image.productId, metadata: { productName: product?.name, sku: product?.sku, wasPrimary: image.isPrimary } },
    ]),
  );
  await db.batch(statements);
  return { ok: true, removed: { url: image.url, storageKey: image.storageKey } };
}

export async function setPrimaryImage(db: Database, imageId: string, actor: AuditActor): Promise<ImageResult> {
  const image = await loadImage(db, imageId);
  if (!image) return { ok: false, message: "Imagen no encontrada." };
  const product = await productInfo(db, image.productId);
  await db.batch([
    db.update(productImages).set({ isPrimary: false }).where(and(eq(productImages.productId, image.productId), eq(productImages.isPrimary, true))),
    db.update(productImages).set({ isPrimary: true }).where(eq(productImages.id, imageId)),
    auditInsert(db, actor, [
      { action: "product.image_primary_changed", entityType: "product", entityId: image.productId, metadata: { productName: product?.name, sku: product?.sku } },
    ]),
  ]);
  return { ok: true };
}

/** Mueve una imagen una posición hacia arriba o hacia abajo en el orden de la galería. */
export async function moveProductImage(db: Database, imageId: string, direction: "up" | "down"): Promise<ImageResult> {
  const image = await loadImage(db, imageId);
  if (!image) return { ok: false, message: "Imagen no encontrada." };
  const ordered = await db
    .select({ id: productImages.id })
    .from(productImages)
    .where(eq(productImages.productId, image.productId))
    .orderBy(asc(productImages.sortOrder), asc(productImages.createdAt));

  const index = ordered.findIndex((row) => row.id === imageId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ordered.length) return { ok: true };

  const ids = ordered.map((row) => row.id);
  [ids[index], ids[target]] = [ids[target], ids[index]];
  const [first, ...rest] = ids.map((id, position) => db.update(productImages).set({ sortOrder: position }).where(eq(productImages.id, id)));
  await db.batch([first, ...rest]);
  return { ok: true };
}

export async function updateImageAlt(db: Database, imageId: string, alt: string): Promise<ImageResult> {
  if (!isUuid(imageId)) return { ok: false, message: "Imagen no encontrada." };
  const text = alt.trim().slice(0, 200);
  await db.update(productImages).set({ alt: text || null }).where(eq(productImages.id, imageId));
  return { ok: true };
}
