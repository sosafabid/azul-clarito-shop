import { after } from "next/server";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { allowAttempt, clientIp } from "@/server/auth/throttle";
import { recordPaymentEvent } from "@/server/services/payments/lifecycle";
import { findPaymentByToken } from "@/server/services/payments/session";
import { notifyVerifyResult, verifyPayment } from "@/server/services/payments/verify";

/**
 * RETORNO DEL NAVEGADOR desde la página de pago de Tilopay (`GET` al `redirect` con code, description, auth, order,
 * tilopay-transaction, OrderHash, returnData…).
 *
 * REGLA: nada de lo que trae la URL (código, monto, estado, OrderHash) se usa para decidir el pago. Solo `returnData` —el token
 * opaco que nosotros enviamos— sirve para saber QUÉ intento verificar; el estado real se pregunta a Tilopay servidor a servidor
 * (`verifyPayment`). Un retorno falso, repetido o alterado no puede marcar nada como pagado. Después se redirige (303) a una
 * página de resultado que solo LEE la base de datos.
 *
 * (El `OrderHash` no se valida: su algoritmo no es público; ver README → "Pagos con Tilopay".)
 */
export const dynamic = "force-dynamic";

const redirectTo = (location: string) => new Response(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const token = (params.get("returnData") ?? "").trim();
  if (!isDatabaseConfigured()) return redirectTo(routes.checkoutResult);

  const db = getDb();
  if (!(await allowAttempt(db, "payment_return_by_ip", await clientIp(), { max: 60, windowSeconds: 15 * 60 }))) return redirectTo(routes.checkoutResult);
  const found = await findPaymentByToken(db, token);
  if (!found) return redirectTo(routes.checkoutResult);

  // Constancia (solo informativa y SIN confiar en ella) de lo que el navegador dijo.
  await recordPaymentEvent(db, {
    orderId: found.orderId,
    paymentId: found.paymentId,
    source: "return",
    type: "browser_return",
    detail: { reportedCode: (params.get("code") ?? "").slice(0, 8), trusted: false },
  });
  const result = await verifyPayment(db, found.paymentId, "return");
  if (result) after(() => notifyVerifyResult(db, result, token));
  return redirectTo(`${routes.checkoutResult}?t=${encodeURIComponent(token)}`);
}
