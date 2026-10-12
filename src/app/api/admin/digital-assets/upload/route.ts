import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/db";
import { DIGITAL_FILE } from "@/domain/fulfillment";
import { isUuid } from "@/domain/ids";
import { can } from "@/domain/permissions";
import { getSession } from "@/server/auth";
import { allowAttempt } from "@/server/auth/throttle";
import { expectedKeyPattern } from "@/server/services/digital/assets";
import { digitalToken, isDigitalStorageConfigured } from "@/server/services/digital/storage";
import { eq } from "drizzle-orm";
import { products } from "@/db/schema";

/**
 * EMISIÓN DE PERMISOS DE SUBIDA para los PDF de libros digitales (almacén PRIVADO).
 *
 * Un PDF puede pesar decenas de MB y las funciones de Vercel solo aceptan cuerpos de ~4,5 MB, así que el archivo viaja directo del
 * navegador al almacén. Esta ruta NO recibe el archivo: solo entrega un permiso de un solo uso, y SOLO después de comprobar, en el servidor:
 *   1. mismo origen   2. sesión válida   3. permiso `products:write`   4. límite de frecuencia
 *   5. que el producto exista y sea DIGITAL   6. que la ruta sea exactamente `digital/<producto>/<uuid>.pdf`
 * El permiso queda limitado a PDF, con tope de tamaño, sin sobrescribir. Después de subir, la acción del servidor vuelve a leer el
 * archivo y comprueba que sea un PDF antes de vincularlo (`attachDigitalAsset`).
 */
export const dynamic = "force-dynamic";

const json = (body: Record<string, unknown>, status: number) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const DENIED = { ok: false, message: "No tenés permiso para esta acción." };

async function authorize(request: Request) {
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
  if (!isDigitalStorageConfigured()) return json({ ok: false, message: "Falta configurar el almacenamiento privado de libros digitales (DIGITAL_BLOB_READ_WRITE_TOKEN)." }, 503);
  const db = getDb();
  if (!(await allowAttempt(db, "digital_upload", session.userId, { max: 30, windowSeconds: 10 * 60 }))) return json({ ok: false, message: "Hiciste muchos intentos seguidos. Esperá unos minutos." }, 429);

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return json({ ok: false, message: "Solicitud inválida." }, 400);
  }

  try {
    const result = await handleUpload({
      body,
      request,
      token: digitalToken(),
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const productId = String(clientPayload ?? "");
        if (!isUuid(productId) || !expectedKeyPattern(productId).test(pathname)) throw new Error("Ruta de archivo no permitida.");
        const [product] = await db.select({ type: products.productType }).from(products).where(eq(products.id, productId)).limit(1);
        if (!product || product.type !== "DIGITAL") throw new Error("El producto no existe o no es digital.");
        return { allowedContentTypes: [DIGITAL_FILE.contentType], maximumSizeInBytes: DIGITAL_FILE.maxBytes, addRandomSuffix: false, allowOverwrite: false, tokenPayload: JSON.stringify({ productId, userId: session.userId }) };
      },
      // Sin onUploadCompleted: el vínculo lo hace la acción del servidor (que además lee y valida el archivo).
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[digital] No se pudo emitir el permiso de subida:", error instanceof Error ? error.name : "error");
    return json({ ok: false, message: "No se pudo preparar la subida." }, 400);
  }
}
