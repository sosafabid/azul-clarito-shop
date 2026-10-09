import "server-only";
import { del, head, put } from "@vercel/blob";
import { eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { orderItems, productImages } from "@/db/schema";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, extensionForImage, storageKeyFor, type ImageItem, type StorageScope } from "@/domain/images";

/**
 * Almacenamiento EXTERNO de imágenes (Vercel Blob, acceso público). Los archivos nunca se guardan
 * en PostgreSQL: la base solo guarda la URL y la clave.
 *
 * `BLOB_READ_WRITE_TOKEN` es un secreto SOLO DE SERVIDOR: este módulo es `server-only` y el token
 * jamás se envía al navegador. El navegador sube los archivos a NUESTRA ruta (`/api/admin/product-images`),
 * que valida sesión, permiso y contenido, y recién entonces los sube a Blob.
 *
 * Tiempos: por defecto el SDK reintenta 10 veces con una espera que se duplica (¡minutos!) y en Vercel la
 * función se cortaría mucho antes. Se limita a 2 reintentos y a 25 s por envío.
 * Si ya definiste VERCEL_BLOB_RETRIES, se respeta.
 */
process.env.VERCEL_BLOB_RETRIES ??= "2";
export const UPLOAD_TIMEOUT_MS = 25_000;

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export type StoredImage = { url: string; storageKey: string };

/** Sube UNA imagen ya validada (el tipo es el detectado por su contenido, no el que declaró el navegador). */
export async function putProductImage(scope: StorageScope, bytes: Uint8Array, type: (typeof ALLOWED_IMAGE_TYPES)[number]): Promise<StoredImage> {
  const extension = extensionForImage(type);
  if (!extension) throw new Error("Tipo de imagen no permitido.");
  const pathname = storageKeyFor(scope, extension);
  const blob = await put(pathname, Buffer.from(bytes), {
    access: "public",
    contentType: type,
    addRandomSuffix: false,
    abortSignal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  });
  return { url: blob.url, storageKey: blob.pathname };
}

/**
 * Comprueba que cada archivo referenciado EXISTE de verdad en el almacenamiento, es una imagen permitida
 * y no supera el tope. Evita guardar en la base una imagen que no existe.
 */
export async function verifyStoredImages(items: readonly ImageItem[]): Promise<{ ok: true } | { ok: false; message: string }> {
  const stored = items.filter((item) => item.storageKey);
  if (stored.length === 0) return { ok: true };
  if (!isBlobConfigured()) return { ok: false, message: "No se puede verificar el almacenamiento de imágenes (falta BLOB_READ_WRITE_TOKEN)." };
  const results = await Promise.allSettled(stored.map((item) => head(item.url)));
  for (const result of results) {
    if (result.status === "rejected") return { ok: false, message: "Una de las imágenes subidas ya no está en el almacenamiento. Subila de nuevo." };
    const { contentType, size } = result.value;
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType) || size > MAX_IMAGE_BYTES) {
      return { ok: false, message: "Una de las imágenes subidas no es válida. Subila de nuevo." };
    }
  }
  return { ok: true };
}

export type BlobRef = { url: string; storageKey: string | null };

/**
 * Borra archivos del almacenamiento SOLO si ya nada los usa:
 *  - ninguna otra fila de `product_images` con esa URL, y
 *  - ningún pedido (`order_items.image_url_snapshot`): el pedido guarda la imagen que tenía el producto al
 *    comprarse, y borrar el archivo rompería el historial.
 * Las URLs externas (sin clave) nunca se borran. Es de mejor esfuerzo: si el borrado físico falla se registra
 * el error y el archivo queda como sobrante inofensivo (la base ya está consistente).
 * Debe llamarse DESPUÉS de quitar la fila de la base.
 */
export async function deleteUnusedImages(db: Database, refs: readonly BlobRef[]): Promise<{ deleted: number; kept: number; failed: number }> {
  const summary = { deleted: 0, kept: 0, failed: 0 };
  if (!isBlobConfigured()) return summary;
  for (const ref of refs) {
    if (!ref.storageKey) continue; // URL externa: no es nuestra
    try {
      const [inGallery] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(productImages).where(eq(productImages.url, ref.url));
      const [inOrders] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(orderItems).where(eq(orderItems.imageUrlSnapshot, ref.url));
      if ((inGallery?.n ?? 0) > 0 || (inOrders?.n ?? 0) > 0) {
        summary.kept += 1;
        continue;
      }
      await del(ref.url);
      summary.deleted += 1;
    } catch (error) {
      summary.failed += 1;
      // El SDK no incluye el token en sus mensajes.
      console.error("[blob] no se pudo borrar un archivo:", error instanceof Error ? `${error.name}: ${error.message}` : "error desconocido");
    }
  }
  return summary;
}
