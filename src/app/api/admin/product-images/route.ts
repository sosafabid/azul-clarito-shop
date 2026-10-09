import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/db";
import { isUuid } from "@/domain/ids";
import { MAX_IMAGE_BYTES, MAX_IMAGES_PER_PRODUCT, describeUploadError, parseImageItems, sniffImageType } from "@/domain/images";
import { can } from "@/domain/permissions";
import { getSession } from "@/server/auth";
import { allowAttempt } from "@/server/auth/throttle";
import { resolveAuditActor } from "@/server/services/audit";
import { addProductImages, countProductImages } from "@/server/services/catalog/admin-images";
import { deleteUnusedImages, isBlobConfigured, putProductImage } from "@/server/services/images/storage";

/**
 * RUTA DE SUBIDA DE IMÁGENES DE PRODUCTO (única puerta hacia el almacenamiento).
 *
 *  POST   (multipart: `file`, y `productId` opcional) → sube UNA imagen.
 *           · con `productId`: queda guardada y vinculada al producto (y se devuelve su fila).
 *           · sin `productId` (producto aún sin crear): queda en la carpeta "pendiente" de quien la sube;
 *             se vincula al guardar el producto, validando que la clave sea suya.
 *  DELETE (JSON: `storageKey`) → descarta una imagen pendiente propia que no se llegó a guardar.
 *
 * Seguridad, en este orden y SIEMPRE en el servidor (esconder el formulario no protege nada):
 *  1. mismo origen   2. sesión válida   3. permiso `products:write`   4. límite de frecuencia
 *  5. tamaño (antes de leer el cuerpo)   6. contenido REAL del archivo (firma de bytes; el nombre, la extensión
 *  y el tipo que declara el navegador se ignoran)   7. cantidad máxima por producto.
 * Los errores no incluyen rutas internas ni el token (que nunca sale del servidor).
 */
export const dynamic = "force-dynamic";

const json = (body: Record<string, unknown>, status: number) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const DENIED = { ok: false, message: "No tenés permiso para esta acción." };

async function authorize(request: Request) {
  // CSRF: una subida legítima viene de esta misma página.
  const origin = request.headers.get("origin");
  if (origin) {
    let sameHost = false;
    try {
      sameHost = new URL(origin).host === (request.headers.get("host") ?? new URL(request.url).host);
    } catch {
      sameHost = false;
    }
    if (!sameHost) return { error: json(DENIED, 403) };
  }
  if (!isDatabaseConfigured()) return { error: json({ ok: false, message: "La base de datos no está configurada." }, 503) };
  const session = await getSession();
  if (!session) return { error: json({ ok: false, message: "Tu sesión venció. Ingresá de nuevo." }, 401) };
  if (!can(session.role, "products:write")) return { error: json(DENIED, 403) };
  return { session };
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  const { session } = auth;

  if (!isBlobConfigured()) {
    return json({ ok: false, message: "Para subir archivos falta configurar el almacenamiento (BLOB_READ_WRITE_TOKEN). Mientras tanto podés usar una URL." }, 503);
  }
  const db = getDb();
  if (!(await allowAttempt(db, "image_upload", session.userId, { max: 120, windowSeconds: 10 * 60 }))) {
    return json({ ok: false, message: "Subiste muchas imágenes seguidas. Esperá unos minutos." }, 429);
  }

  // Tamaño ANTES de leer el cuerpo (el margen cubre el encabezado multipart).
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_IMAGE_BYTES + 64 * 1024) {
    return json({ ok: false, message: `La imagen supera el máximo de ${MAX_IMAGE_BYTES / 1024 / 1024} MB.` }, 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, message: "No se pudo leer el archivo enviado." }, 400);
  }
  const file = form.get("file");
  if (typeof file === "string" || file === null) return json({ ok: false, message: "No se recibió ningún archivo." }, 400);
  if (file.size <= 0) return json({ ok: false, message: "El archivo está vacío." }, 400);
  if (file.size > MAX_IMAGE_BYTES) {
    return json({ ok: false, message: `La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB; el máximo es ${MAX_IMAGE_BYTES / 1024 / 1024} MB. Reducila antes de subirla.` }, 413);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return json({ ok: false, message: "Solo se aceptan imágenes JPG, PNG, WebP o AVIF." }, 415);

  const rawProductId = form.get("productId");
  const productId = typeof rawProductId === "string" && rawProductId !== "" ? rawProductId : null;
  if (productId !== null && !isUuid(productId)) return json({ ok: false, message: "Producto no válido." }, 400);

  if (productId) {
    const existing = await countProductImages(db, productId);
    if (existing === null) return json({ ok: false, message: "Producto no encontrado." }, 404);
    if (existing >= MAX_IMAGES_PER_PRODUCT) return json({ ok: false, message: `Un producto admite hasta ${MAX_IMAGES_PER_PRODUCT} imágenes.` }, 409);
  }

  let stored;
  try {
    stored = await putProductImage(productId ? { kind: "product", productId } : { kind: "pending", userId: session.userId }, bytes, type);
  } catch (error) {
    // El detalle técnico queda en los registros del servidor (el SDK no incluye el token en sus mensajes).
    console.error("[blob] no se pudo subir la imagen:", error instanceof Error ? `${error.name}: ${error.message}` : "error desconocido");
    return json({ ok: false, message: describeUploadError(error) }, 502);
  }

  if (!productId) return json({ ok: true, url: stored.url, storageKey: stored.storageKey }, 200);

  // Producto existente: se vincula ahora. Si la base falla, se borra el archivo (nada queda "guardado" a medias).
  const result = await addProductImages(db, productId, [stored], resolveAuditActor(session));
  if (!result.ok) {
    await deleteUnusedImages(db, [{ url: stored.url, storageKey: stored.storageKey }]);
    return json({ ok: false, message: result.message }, 409);
  }
  return json({ ok: true, url: stored.url, storageKey: stored.storageKey, image: result.added?.[0] ?? null }, 200);
}

export async function DELETE(request: Request) {
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  const { session } = auth;

  let item: { url: string; storageKey: string } | null = null;
  try {
    const body = (await request.json()) as { url?: unknown; storageKey?: unknown };
    const parsed = parseImageItems(JSON.stringify([{ url: body.url, storageKey: body.storageKey }]), [{ kind: "pending", userId: session.userId }]);
    // Solo se pueden descartar archivos PENDIENTES PROPIOS (la clave debe estar en la carpeta de esta persona y la URL
    // debe apuntar a ella). Las imágenes guardadas de un producto se quitan desde la galería, por su id y con permiso,
    // nunca por una URL que mande el navegador.
    if (parsed.ok && parsed.items[0]?.storageKey) item = { url: parsed.items[0].url, storageKey: parsed.items[0].storageKey };
  } catch {
    item = null;
  }
  if (!item) return json(DENIED, 403);

  const result = await deleteUnusedImages(getDb(), [item]);
  return json({ ok: true, deleted: result.deleted > 0 }, 200);
}
