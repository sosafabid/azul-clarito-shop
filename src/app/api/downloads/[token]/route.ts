import { getDb, isDatabaseConfigured } from "@/db";
import { isUuid } from "@/domain/ids";
import { allowAttempt, clientIp } from "@/server/auth/throttle";
import { claimDownloadByToken, claimDownloadForOrderPage, isDownloadToken, refundDownload, type ClaimedDownload } from "@/server/services/digital/delivery";
import { openDigitalBlob } from "@/server/services/digital/storage";
import { findPaymentByToken } from "@/server/services/payments/session";
import { routes } from "@/config/routes";

/**
 * DESCARGA DE UN LIBRO DIGITAL (PDF). Dos formas de llegar, las dos con el pago verificado EN CADA petición:
 *   1) /api/downloads/<token>            → enlace temporal que llegó por correo (o por "Recuperar mi compra").
 *   2) /api/downloads/<id del libro>?t=… → botón de la página del pedido (el acceso lo da el enlace privado del pedido).
 * Nada se autoriza por haber vuelto a la página de éxito: `claim…` comprueba en la base que el pedido esté pagado.
 * Cualquier fallo (enlace inventado, vencido, agotado, pedido sin pagar/cancelado/reembolsado) responde lo mismo: 404, sin revelar por qué.
 * El archivo se lee del almacén PRIVADO y se entrega en streaming; la respuesta nunca se guarda en cachés.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } as const;

function denied(status: 404 | 429 | 503, message: string): Response {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Descarga no disponible</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1.25rem;color:#0B2A5B"><h1>Descarga no disponible</h1><p>${message}</p><p><a href="${routes.recoverPurchase}" style="color:#0B2A5B">Pedir un enlace nuevo</a> · <a href="${routes.shop}" style="color:#0B2A5B">Volver a la tienda</a></p></body></html>`;
  return new Response(html, { status, headers: { ...NO_STORE, "Content-Type": "text/html; charset=utf-8" } });
}

const asciiName = (name: string) => name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");

export async function GET(request: Request, context: { params: Promise<{ token: string }> }): Promise<Response> {
  if (!isDatabaseConfigured()) return denied(503, "El servicio no está disponible por ahora. Intentá de nuevo en unos minutos.");
  const { token } = await context.params;
  const db = getDb();

  if (!(await allowAttempt(db, "download_by_ip", await clientIp(), { max: 60, windowSeconds: 15 * 60 }))) {
    return denied(429, "Hiciste muchos intentos seguidos. Esperá unos minutos y volvé a probar.");
  }

  let claim: ClaimedDownload | null = null;
  if (isDownloadToken(token)) {
    claim = await claimDownloadByToken(db, token);
  } else if (isUuid(token)) {
    const privateToken = new URL(request.url).searchParams.get("t") ?? "";
    const found = await findPaymentByToken(db, privateToken);
    if (found) claim = await claimDownloadForOrderPage(db, { orderId: found.orderId, orderItemId: token });
  }
  if (!claim) return denied(404, "Este enlace no es válido, ya venció, llegó a su límite de descargas o el pago de la compra no está confirmado.");

  const file = await openDigitalBlob(claim.storageKey);
  if (!file) {
    await refundDownload(db, claim.linkId); // el intento no se cuenta si el archivo no se pudo leer
    return denied(503, "No pudimos preparar tu archivo en este momento. No se descontó la descarga: probá de nuevo en unos minutos.");
  }

  const headers: Record<string, string> = {
    ...NO_STORE,
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${asciiName(claim.fileName)}"; filename*=UTF-8''${encodeURIComponent(claim.fileName)}`,
  };
  if (file.size) headers["Content-Length"] = String(file.size);
  return new Response(file.stream, { status: 200, headers });
}
