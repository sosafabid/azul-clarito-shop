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
