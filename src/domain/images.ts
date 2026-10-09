/** Reglas de imágenes de producto. Los archivos viven en almacenamiento externo; en la base solo se guarda la referencia. */
export const MAX_IMAGES_PER_PRODUCT = 10;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB (límite práctico de una petición en Vercel)
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function extensionForImage(type: string): string | null {
  return EXTENSIONS[type] ?? null;
}

/**
 * Tipo REAL de la imagen según sus primeros bytes ("firma" del formato). Nunca se confía en el nombre,
 * la extensión ni el `Content-Type` que manda el navegador: un ejecutable renombrado a .jpg no pasa.
 */
export function sniffImageType(bytes: Uint8Array): (typeof ALLOWED_IMAGE_TYPES)[number] | null {
  const at = (offset: number, ...values: number[]) => values.every((value, index) => bytes[offset + index] === value);
  if (bytes.length >= 3 && at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (bytes.length >= 8 && at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  // WebP: "RIFF" + tamaño + "WEBP"
  if (bytes.length >= 12 && at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  // AVIF: caja "ftyp" en el byte 4 con la marca "avif" o "avis"
  if (bytes.length >= 12 && at(4, 0x66, 0x74, 0x79, 0x70) && (at(8, 0x61, 0x76, 0x69, 0x66) || at(8, 0x61, 0x76, 0x69, 0x73))) return "image/avif";
  return null;
}

/** Valida un archivo subido. Devuelve un mensaje en español, o `null` si es válido. */
export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Solo se aceptan imágenes JPG, PNG, WebP o AVIF.";
  }
  if (file.size <= 0) return "El archivo está vacío.";
  if (file.size > MAX_IMAGE_BYTES) {
    return `La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB; el máximo es ${MAX_IMAGE_BYTES / 1024 / 1024} MB. Reducila antes de subirla.`;
  }
  return null;
}

/**
 * Valida el conjunto de archivos de UN envío. Vercel limita la petición completa
 * (~4,5 MB), así que la SUMA también tiene tope aunque cada archivo cumpla.
 */
export function validateImageBatch(files: readonly { type: string; size: number; name?: string }[]): string | null {
  for (const file of files) {
    const problem = validateImageFile(file);
    if (problem) return file.name ? `${file.name}: ${problem}` : problem;
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_IMAGE_BYTES) {
    return `Los archivos de este envío suman ${(total / 1024 / 1024).toFixed(1)} MB; el máximo por envío es ${MAX_IMAGE_BYTES / 1024 / 1024} MB. Subí las imágenes de a una o reducilas.`;
  }
  return null;
}

/** Una URL de imagen válida: https, sin credenciales, de largo razonable. */
export function parseImageUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  const value = raw.trim();
  if (value.length > 500) return { ok: false, error: "La URL es demasiado larga." };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: `“${value.slice(0, 60)}” no es una URL válida.` };
  }
  if (url.protocol !== "https:") return { ok: false, error: "Las imágenes deben usar https://." };
  if (url.username || url.password) return { ok: false, error: "La URL no puede incluir usuario ni contraseña." };
  return { ok: true, url: url.toString() };
}

/** Varias URLs (una por línea o separadas por espacios/comas). */
export function parseImageUrls(text: string): { urls: string[]; errors: string[] } {
  const urls: string[] = [];
  const errors: string[] = [];
  for (const piece of text.split(/[\s,]+/).filter(Boolean)) {
    const parsed = parseImageUrl(piece);
    if (!parsed.ok) errors.push(parsed.error);
    else if (!urls.includes(parsed.url)) urls.push(parsed.url);
  }
  return { urls, errors };
}

/**
 * Traduce un error del servicio de almacenamiento a un mensaje útil para quien administra
 * la tienda (el detalle técnico queda en los registros del servidor, sin secretos).
 */
export function describeUploadError(error: unknown): string {
  const text = error instanceof Error ? `${error.name} ${error.message}`.toLowerCase() : "";
  if (text.includes("abort") || text.includes("timeout") || text.includes("timed out")) {
    return "El almacenamiento tardó demasiado en responder. Intentá de nuevo (con una imagen más liviana si es posible).";
  }
  if (text.includes("access denied") || text.includes("blobaccesserror") || text.includes("token")) {
    return "El almacenamiento rechazó el acceso: revisá que BLOB_READ_WRITE_TOKEN sea el correcto y pertenezca al proyecto actual.";
  }
  if (text.includes("store") && (text.includes("not exist") || text.includes("not found") || text.includes("suspended"))) {
    return "No encontramos el almacenamiento de imágenes (Blob store) o está suspendido. Revisá la conexión en Vercel.";
  }
  if (text.includes("private")) {
    return "El almacenamiento está configurado como privado. Creá un Blob store de acceso Público para las imágenes de la tienda.";
  }
  return "No se pudo subir la imagen al almacenamiento. Intentá de nuevo; si sigue fallando, revisá los registros del servidor.";
}


// ───────────────────────── referencias a archivos ya subidos ─────────────────────────
/**
 * Rutas de los archivos en el almacenamiento:
 *   products/<idDelProducto>/<uuid>.<ext>        producto que ya existe
 *   products/pending/<idDeQuienSube>/<uuid>.<ext>  producto que todavía no se guardó
 * La ruta dice a quién pertenece cada archivo: así una petición manipulada no puede "adoptar" ni borrar
 * archivos de otro producto o de otra persona.
 */
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const BLOB_HOST = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/;

export type StorageScope = { kind: "product"; productId: string } | { kind: "pending"; userId: string };

export function storageKeyFor(scope: StorageScope, extension: string): string {
  const folder = scope.kind === "product" ? scope.productId : `pending/${scope.userId}`;
  return `products/${folder}/${crypto.randomUUID()}.${extension}`;
}

export function isKeyInScope(key: string, scope: StorageScope): boolean {
  const id = scope.kind === "product" ? scope.productId : scope.userId;
  if (!new RegExp(`^${UUID}$`).test(id)) return false; // el id va dentro de una expresión regular: solo UUID
  const folder = scope.kind === "product" ? scope.productId : `pending/${scope.userId}`;
  return new RegExp(`^products/${folder}/${UUID}\\.(jpg|png|webp|avif)$`).test(key);
}

export type ImageItem = { url: string; storageKey?: string };

/**
 * Lee la lista de imágenes que envía el formulario (JSON). Cada elemento es una URL externa https, o un
 * archivo ya subido: en ese caso la clave debe pertenecer al ámbito indicado y la URL debe apuntar
 * EXACTAMENTE a esa clave en el almacenamiento público. Cualquier otra cosa se rechaza.
 */
export function parseImageItems(raw: string, allowedScopes: readonly StorageScope[]): { ok: true; items: ImageItem[] } | { ok: false; error: string } {
  if (raw.trim() === "") return { ok: true, items: [] };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: "La lista de imágenes no es válida. Recargá la página e intentá de nuevo." };
  }
  if (!Array.isArray(data) || data.length > MAX_IMAGES_PER_PRODUCT) {
    return { ok: false, error: `Máximo ${MAX_IMAGES_PER_PRODUCT} imágenes por producto.` };
  }
  const items: ImageItem[] = [];
  for (const entry of data) {
    const url = typeof entry?.url === "string" ? entry.url : "";
    const key = typeof entry?.storageKey === "string" ? entry.storageKey : undefined;
    const parsed = parseImageUrl(url);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    if (key !== undefined) {
      const parsedUrl = new URL(parsed.url);
      const valid = allowedScopes.some((scope) => isKeyInScope(key, scope)) && BLOB_HOST.test(parsedUrl.hostname) && parsedUrl.pathname === `/${key}` && !parsedUrl.search;
      if (!valid) return { ok: false, error: "Una de las imágenes subidas no es válida. Subila de nuevo." };
    }
    if (!items.some((item) => item.url === parsed.url)) items.push(key ? { url: parsed.url, storageKey: key } : { url: parsed.url });
  }
  return { ok: true, items };
}
