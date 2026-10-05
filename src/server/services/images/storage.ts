import "server-only";
import { del, put } from "@vercel/blob";
import { extensionForImage, validateImageBatch } from "@/domain/images";

/**
 * Almacenamiento EXTERNO de imágenes (Vercel Blob). Los archivos nunca se guardan
 * en PostgreSQL: la base solo guarda la URL (y la clave, para poder borrarlos).
 *
 * Requiere la variable `BLOB_READ_WRITE_TOKEN` (se crea al agregar un "Blob store"
 * al proyecto en Vercel). Sin ella, el panel igual permite asociar imágenes por URL.
 */
export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export type StoredImage = { url: string; storageKey: string };

export async function storeProductImage(productId: string, file: File): Promise<StoredImage> {
  const extension = extensionForImage(file.type);
  if (!extension) throw new Error("Tipo de imagen no permitido.");
  const pathname = `products/${productId}/${crypto.randomUUID()}.${extension}`;
  const blob = await put(pathname, file, { access: "public", contentType: file.type, addRandomSuffix: false });
  return { url: blob.url, storageKey: blob.pathname };
}

/** Borra archivos del almacenamiento (mejor esfuerzo: un fallo no debe romper el flujo del panel). */
export async function deleteStoredImages(urls: readonly string[]): Promise<void> {
  if (urls.length === 0 || !isBlobConfigured()) return;
  await Promise.allSettled(urls.map((url) => del(url)));
}

export type UploadResult = { ok: true; images: StoredImage[] } | { ok: false; message: string };

/**
 * Valida y sube varios archivos. Si uno falla, borra los que ya se habían subido
 * (para no dejar archivos huérfanos) y devuelve un mensaje en español.
 */
export async function storeProductImages(productId: string, files: readonly File[]): Promise<UploadResult> {
  if (files.length === 0) return { ok: true, images: [] };
  if (!isBlobConfigured()) {
    return {
      ok: false,
      message: "Para subir archivos falta configurar el almacenamiento (BLOB_READ_WRITE_TOKEN). Mientras tanto podés asociar imágenes por URL.",
    };
  }
  const problem = validateImageBatch(files);
  if (problem) return { ok: false, message: problem };
  const uploaded: StoredImage[] = [];
  try {
    for (const file of files) uploaded.push(await storeProductImage(productId, file));
    return { ok: true, images: uploaded };
  } catch {
    await deleteStoredImages(uploaded.map((image) => image.url));
    return { ok: false, message: "No se pudo subir la imagen al almacenamiento. Intentá de nuevo." };
  }
}
