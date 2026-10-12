import "server-only";
import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import {
  BlobAccessError,
  BlobClientTokenExpiredError,
  BlobContentTypeNotAllowedError,
  BlobError,
  BlobFileTooLargeError,
  BlobNotFoundError,
  BlobRequestAbortedError,
  BlobServiceNotAvailable,
  BlobServiceRateLimited,
  BlobStoreNotFoundError,
  BlobStoreSuspendedError,
  del,
  get,
  head,
  put,
} from "@vercel/blob";
import { DIGITAL_FILE, looksLikePdf, type StorageProbe, type StorageProbeStep } from "@/domain/fulfillment";

/**
 * ALMACENAMIENTO PRIVADO de los libros digitales (Vercel Blob, acceso `private`).
 *
 * Es un almacén APARTE del de las imágenes (que es público): se configura con su propio token, `DIGITAL_BLOB_READ_WRITE_TOKEN`.
 * Nunca se cae al token de imágenes, para que un PDF de pago jamás termine por error en un almacén público.
 *
 * Los archivos NO tienen URL pública: el navegador nunca recibe la dirección del almacenamiento. Solo se leen desde el servidor
 * (`openDigitalBlob`) y se entregan por `/api/downloads/[token]`, después de verificar el pago.
 * El token es un secreto SOLO DE SERVIDOR (este módulo es `server-only`).
 */
export const digitalToken = (): string | undefined => process.env.DIGITAL_BLOB_READ_WRITE_TOKEN || undefined;

export function isDigitalStorageConfigured(): boolean {
  return Boolean(digitalToken());
}

export type InspectedBlob = { ok: true; size: number; sha256: string } | { ok: false; message: string };

/**
 * Comprueba un archivo ya subido: existe, es un PDF por su CONTENIDO (firma `%PDF-`, no por el nombre ni el tipo declarado),
 * no supera el tope y calcula su huella SHA-256 leyéndolo en streaming.
 */
export async function inspectDigitalBlob(pathname: string): Promise<InspectedBlob> {
  const token = digitalToken();
  if (!token) return { ok: false, message: "El almacenamiento privado de libros digitales no está configurado (falta DIGITAL_BLOB_READ_WRITE_TOKEN)." };
  try {
    const meta = await head(pathname, { token });
    if (meta.size <= 0 || meta.size > DIGITAL_FILE.maxBytes) return { ok: false, message: `El PDF debe pesar entre 1 byte y ${Math.round(DIGITAL_FILE.maxBytes / 1024 / 1024)} MB.` };
    const result = await get(pathname, { access: "private", token, useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return { ok: false, message: "No se pudo leer el archivo subido. Subilo de nuevo." };
    const hash = createHash("sha256");
    let total = 0;
    let first = true;
    for await (const chunk of result.stream as unknown as AsyncIterable<Uint8Array>) {
      if (first) {
        first = false;
        if (!looksLikePdf(chunk)) {
          await result.stream.cancel().catch(() => undefined);
          return { ok: false, message: "El archivo no es un PDF válido." };
        }
      }
      total += chunk.byteLength;
      if (total > DIGITAL_FILE.maxBytes) return { ok: false, message: "El PDF es demasiado grande." };
      hash.update(chunk);
    }
    if (total <= 0) return { ok: false, message: "El archivo está vacío." };
    return { ok: true, size: total, sha256: hash.digest("hex") };
  } catch (error) {
    console.error("[digital] No se pudo verificar un archivo:", error instanceof Error ? error.name : "error");
    return { ok: false, message: "No se pudo verificar el archivo subido. Subilo de nuevo." };
  }
}

/** Abre el PDF para entregarlo (flujo en streaming; nunca se carga entero en memoria). `null` si ya no existe. */
export async function openDigitalBlob(pathname: string): Promise<{ stream: ReadableStream<Uint8Array>; size: number | null } | null> {
  const token = digitalToken();
  if (!token) return null;
  try {
    const result = await get(pathname, { access: "private", token });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return { stream: result.stream, size: result.blob.size ?? null };
  } catch (error) {
    console.error("[digital] No se pudo abrir un archivo para entregarlo:", error instanceof Error ? error.name : "error");
    return null;
  }
}

/** Borra archivos del almacén privado (mejor esfuerzo). Solo se llama para archivos que ya nada referencia. */
export async function deleteDigitalBlobs(keys: readonly string[]): Promise<void> {
  const token = digitalToken();
  if (!token || keys.length === 0) return;
  try {
    await del([...keys], { token });
  } catch (error) {
    console.error("[digital] No se pudieron borrar archivos sobrantes:", error instanceof Error ? error.name : "error");
  }
}

/** Traduce un error del SDK de Vercel Blob a un mensaje claro para quien administra la tienda (nunca incluye el token). */
export function describeStorageError(error: unknown): string {
  if (error instanceof BlobAccessError) return "El almacén rechazó el token (acceso denegado). Revisá que DIGITAL_BLOB_READ_WRITE_TOKEN sea el token de lectura/escritura del almacén privado y que no esté vencido ni sea de otro almacén.";
  if (error instanceof BlobStoreNotFoundError) return "El almacén de este token no existe (¿se borró o es de otro proyecto?). Creá uno privado y actualizá DIGITAL_BLOB_READ_WRITE_TOKEN.";
  if (error instanceof BlobStoreSuspendedError) return "El almacén de Vercel Blob está suspendido. Revisá tu cuenta de Vercel (límites o facturación).";
  if (error instanceof BlobFileTooLargeError) return "El archivo supera el tamaño máximo permitido.";
  if (error instanceof BlobContentTypeNotAllowedError) return "El almacén rechazó el tipo de archivo: solo se aceptan PDF.";
  if (error instanceof BlobClientTokenExpiredError) return "El permiso de subida venció. Probá de nuevo.";
  if (error instanceof BlobServiceRateLimited) return "Vercel Blob está limitando las solicitudes. Esperá un minuto y probá de nuevo.";
  if (error instanceof BlobServiceNotAvailable) return "Vercel Blob no está disponible en este momento. Probá de nuevo en unos minutos.";
  if (error instanceof BlobRequestAbortedError) return "La conexión con el almacén se cortó. Probá de nuevo.";
  if (error instanceof BlobNotFoundError) return "El archivo no se encontró en el almacén.";
  if (error instanceof BlobError) {
    // Mensajes de configuración conocidos: p. ej. usar un almacén PÚBLICO con acceso privado.
    if (/private|public/i.test(error.message)) return "El almacén no acepta archivos privados: parece ser un almacén PÚBLICO. Creá un almacén Blob con acceso Private y usá su token.";
    return "Vercel Blob devolvió un error. Revisá la configuración del almacén privado y probá de nuevo.";
  }
  return "No se pudo conectar con el almacén. Revisá tu conexión y la configuración.";
}


/**
 * Prueba de punta a punta del almacén privado con un PDF diminuto: escribe, comprueba que el almacén sea privado, lee de vuelta
 * (mismo contenido) y borra. No toca ningún producto ni deja archivos. Sirve para validar la configuración sin vender nada.
 */
export async function probeDigitalStorage(): Promise<StorageProbe> {
  const steps: StorageProbeStep[] = [];
  const fail = (name: string, message: string): StorageProbe => {
    steps.push({ name, ok: false, detail: message });
    return { ok: false, message, steps };
  };
  const token = digitalToken();
  if (!token) return fail("Configuración", "Falta la variable DIGITAL_BLOB_READ_WRITE_TOKEN en el servidor. Mirá docs/PRODUCTOS-DIGITALES.md, sección 'Configurar el almacén privado'.");
  steps.push({ name: "Configuración", ok: true });

  const body = Buffer.from(`%PDF-1.4\n% prueba de almacenamiento ${randomUUID()}\n%%EOF\n`);
  const pathname = `${DIGITAL_FILE.keyPrefix}/_check/${randomUUID()}.pdf`;
  let uploadedUrl = "";
  try {
    const blob = await put(pathname, body, { access: "private", token, contentType: DIGITAL_FILE.contentType, addRandomSuffix: false, allowOverwrite: false });
    uploadedUrl = blob.url;
    steps.push({ name: "Escritura", ok: true });
  } catch (error) {
    console.error("[digital] Prueba de almacenamiento: falló la escritura:", error instanceof Error ? error.name : "error");
    return fail("Escritura", describeStorageError(error));
  }

  try {
    let host = "";
    try {
      host = new URL(uploadedUrl).hostname;
    } catch {
      host = "";
    }
    if (host.includes(".public.")) return fail("Almacén privado", "Este almacén es PÚBLICO: los PDF tendrían una dirección abierta. Creá un almacén Blob con acceso Private y usá su token.");
    steps.push({ name: "Almacén privado", ok: true });

    const read = await get(pathname, { access: "private", token, useCache: false });
    if (!read || read.statusCode !== 200 || !read.stream) return fail("Lectura", "El archivo se escribió pero no se pudo leer de vuelta desde el servidor.");
    const chunks: Uint8Array[] = [];
    for await (const chunk of read.stream as unknown as AsyncIterable<Uint8Array>) chunks.push(chunk);
    if (!Buffer.concat(chunks).equals(body)) return fail("Lectura", "El contenido leído no coincide con el que se escribió.");
    steps.push({ name: "Lectura", ok: true });
  } catch (error) {
    console.error("[digital] Prueba de almacenamiento: falló la lectura:", error instanceof Error ? error.name : "error");
    return fail("Lectura", describeStorageError(error));
  } finally {
    try {
      await del(pathname, { token });
    } catch (error) {
      console.error("[digital] Prueba de almacenamiento: no se pudo borrar el archivo de prueba:", error instanceof Error ? error.name : "error");
    }
  }

  try {
    const gone = await get(pathname, { access: "private", token, useCache: false });
    steps.push({ name: "Borrado", ok: gone === null, detail: gone === null ? undefined : "El archivo de prueba sigue en el almacén (se puede borrar a mano)." });
  } catch {
    steps.push({ name: "Borrado", ok: true });
  }
  return { ok: true, message: "El almacén privado funciona: se escribió, se leyó de vuelta y se borró un PDF de prueba.", steps };
}
