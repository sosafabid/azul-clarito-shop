import "server-only";
import { del, put } from "@vercel/blob";
import { describeUploadError, extensionForImage, validateImageBatch } from "@/domain/images";

/**
 * Almacenamiento EXTERNO de imágenes (Vercel Blob). Los archivos nunca se guardan
 * en PostgreSQL: la base solo guarda la URL (y la clave, para poder borrarlos).
 *
 * Requiere la variable `BLOB_READ_WRITE_TOKEN` (se crea al agregar un "Blob store"
 * al proyecto en Vercel). Sin ella, el panel igual permite asociar imágenes por URL.
 */
/**
 * Tiempos: por defecto el SDK reintenta 10 veces con una espera que se duplica (¡minutos!) y en Vercel la
 * función se cortaría mucho antes, dejando a la persona con un error genérico. Se limita a 2 reintentos
 * (aguanta un tropiezo momentáneo, falla rápido si es una caída) y a 25 s en total por envío.
 * Si ya definiste VERCEL_BLOB_RETRIES, se respeta.
 */
process.env.VERCEL_BLOB_RETRIES ??= "2";
export const UPLOAD_TIMEOUT_MS = 25_000;

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export type StoredImage = { url: string; storageKey: string };

export async function storeProductImage(productId: string, file: File): Promise<StoredImage> {
  const extension = extensionForImage(file.type);
  if (!extension) throw new Error("Tipo de imagen no permitido.");
  const pathname = `products/${productId}/${crypto.randomUUID()}.${extension}`;
  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type,
    addRandomSuffix: false,
    abortSignal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  });
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
  // En paralelo (es mucho más rápido). Si alguno falla, se borran los que sí se subieron: sin archivos huérfanos.
  const results = await Promise.allSettled(files.map((file) => storeProductImage(productId, file)));
  const uploaded = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
  if (failure) {
    await deleteStoredImages(uploaded.map((image) => image.url));
    // El detalle técnico queda en los registros del servidor (el SDK no incluye el token en sus mensajes).
    const reason = failure.reason;
    console.error("[blob] no se pudo subir la imagen:", reason instanceof Error ? `${reason.name}: ${reason.message}` : reason);
    return { ok: false, message: describeUploadError(reason) };
  }
  return { ok: true, images: uploaded };
}
