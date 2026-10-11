"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { AUTH_MESSAGES } from "@/domain/auth-tokens";
import { parseCheckoutForm, type CheckoutFormErrors } from "@/domain/checkout-form";
import { getSession } from "@/server/auth";
import { allowAttempt, clientIp } from "@/server/auth/throttle";
import { getCartOwner } from "@/server/services/cart/identity";
import { calculateCheckoutTotals } from "@/server/services/checkout/totals";
import { getPendingOrderForCart, placeOrder } from "@/server/services/checkout/place-order";
import { sendOrderEmail } from "@/server/services/orders/notify";
import { cancelOrderSafely } from "@/server/services/payments/reconcile";
import { findPaymentByToken, openPaymentSession, type SessionResult } from "@/server/services/payments/session";
import { notifyVerifyResult, verifyPayment } from "@/server/services/payments/verify";

/**
 * ACCIONES PÚBLICAS DEL CHECKOUT. Una visitante invitada también compra, así que no exigen sesión.
 *
 * Seguridad (verificada por pruebas de arquitectura):
 *  - NINGUNA recibe un precio, impuesto, costo de envío ni total para USARLO: el servidor recalcula todo desde la base de datos.
 *    (`seenTotal` solo se COMPARA con el total recalculado para avisar si cambió; nunca es el monto que se cobra.)
 *  - La dueña del carrito se deduce de la sesión o de la cookie de invitada; el pedido a retomar/cancelar se deduce de ese
 *    carrito, o del token privado del enlace de pago. Jamás se recibe un id de pedido o de usuario.
 *  - Con límites de frecuencia por IP y por correo.
 *  - Los datos de tarjeta NUNCA pasan por aquí: el pago ocurre en la página de Tilopay.
 */
export type CheckoutState = { message?: string; errors?: CheckoutFormErrors; pendingOrder?: boolean } | null;

const NO_DB = "La tienda no está disponible por ahora. Intentá de nuevo más tarde.";
const LIMITS = { ip: { max: 25, windowSeconds: 60 * 60 }, email: { max: 8, windowSeconds: 60 * 60 }, token: { max: 40, windowSeconds: 15 * 60 } } as const;

function sessionFailure(result: Exclude<SessionResult, { kind: "redirect" | "paid" }>): string {
  if (result.kind === "unavailable") return "El pago en línea no está disponible por el momento. Escribinos y te ayudamos a completar tu compra.";
  if (result.kind === "not_payable") return "Este pedido ya no se puede pagar.";
  if (result.reason === "verification") return "No pudimos verificar tu intento de pago anterior. Esperá unos minutos y volvé a intentarlo.";
  if (result.reason === "busy") return "Ya hay un intento de pago en curso. Esperá unos segundos y revisá el estado de tu pedido.";
  return "No pudimos abrir la página de pago. Tu pedido quedó guardado: podés reintentar o escribirnos.";
}

/** Crea el pedido pendiente (con el stock reservado) y redirige a la página de pago de Tilopay. */
export async function startPaymentAction(_previous: CheckoutState, formData: FormData): Promise<CheckoutState> {
  if (!isDatabaseConfigured()) return { message: NO_DB };
  if (String(formData.get("website") ?? "") !== "") return { message: NO_DB }; // campo trampa para bots

  const db = getDb();
  if (!(await allowAttempt(db, "checkout_by_ip", await clientIp(), LIMITS.ip))) return { message: AUTH_MESSAGES.tooMany };
  const parsed = parseCheckoutForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, message: "Revisá los datos marcados." };
  const form = parsed.value;
  if (!(await allowAttempt(db, "checkout_by_email", form.email, LIMITS.email))) return { message: AUTH_MESSAGES.tooMany };

  const owner = await getCartOwner();
  if (!owner) return { message: "Tu carrito está vacío." };

  // Si el total que la clienta vio ya no coincide con el recalculado (cambió un precio, una tasa o una tarifa), no se cobra a ciegas.
  const seen = Number(String(formData.get("seenTotal") ?? ""));
  const { totals } = await calculateCheckoutTotals(db, { owner, destination: { country: "CR", province: form.province, city: form.city, postalCode: form.postalCode }, shippingMethodId: null });
  if (Number.isInteger(seen) && totals.total !== null && seen !== totals.total) {
    revalidatePath(routes.checkout);
    return { message: "El total de tu compra cambió. Revisá el resumen actualizado antes de pagar." };
  }

  const session = await getSession();
  const placed = await placeOrder(db, { owner, userId: session?.userId ?? null, form });
  if (!placed.ok) {
    if (placed.code === "pending_exists") revalidatePath(routes.checkout);
    return { message: placed.message, pendingOrder: placed.code === "pending_exists" };
  }

  const opened = await openPaymentSession(db, placed.orderId, "checkout");
  const token = opened.kind === "redirect" || (opened.kind === "failed" && opened.token) ? (opened as { token?: string }).token : undefined;
  after(() => sendOrderEmail(db, { orderId: placed.orderId, event: "order_received", token }));
  if (opened.kind === "redirect") redirect(opened.url);
  if (opened.kind === "paid") redirect(routes.checkout);
  if (token) redirect(`${routes.checkoutResult}?t=${token}`);
  return { message: sessionFailure(opened as Exclude<SessionResult, { kind: "redirect" | "paid" }>) };
}

/** Retoma el pedido pendiente de ESTE carrito (el que ya tenía creado) y abre su página de pago. */
export async function resumePendingOrderAction(): Promise<CheckoutState> {
  if (!isDatabaseConfigured()) return { message: NO_DB };
  const db = getDb();
  if (!(await allowAttempt(db, "checkout_by_ip", await clientIp(), LIMITS.ip))) return { message: AUTH_MESSAGES.tooMany };
  const owner = await getCartOwner();
  const pending = owner ? await getPendingOrderForCart(db, owner) : null;
  if (!pending) return { message: "No encontramos un pedido pendiente." };
  const opened = await openPaymentSession(db, pending.id, "checkout");
  if (opened.kind === "redirect") redirect(opened.url);
  if (opened.kind === "failed" && opened.token) redirect(`${routes.checkoutResult}?t=${opened.token}`);
  if (opened.kind === "paid") redirect(routes.checkout);
  return { message: sessionFailure(opened as Exclude<SessionResult, { kind: "redirect" | "paid" }>), pendingOrder: true };
}

/** Cancela el pedido pendiente de este carrito (después de verificar que no se haya pagado) para empezar de nuevo. */
export async function cancelPendingOrderAction(): Promise<CheckoutState> {
  if (!isDatabaseConfigured()) return { message: NO_DB };
  const db = getDb();
  if (!(await allowAttempt(db, "checkout_by_ip", await clientIp(), LIMITS.ip))) return { message: AUTH_MESSAGES.tooMany };
  const owner = await getCartOwner();
  const pending = owner ? await getPendingOrderForCart(db, owner) : null;
  if (!pending) return null;
  const outcome = await cancelOrderSafely(db, pending.id, "return");
  revalidatePath(routes.checkout);
  if (outcome === "paid") return { message: "Ese pedido ya está pagado. Lo ves en tu correo de confirmación." };
  if (outcome === "unverifiable") return { message: "No pudimos verificar el estado del pago. Esperá unos minutos y volvé a intentar.", pendingOrder: true };
  return { message: "Cancelamos el pedido pendiente. Podés armar tu compra de nuevo.", pendingOrder: false };
}

// ── Página de resultado (enlace privado con token) ───────────────────────────
export type ResultActionState = { message?: string } | null;

async function byToken(formData: FormData) {
  const db = getDb();
  if (!(await allowAttempt(db, "checkout_token_by_ip", await clientIp(), LIMITS.token))) return { db, found: null, tooMany: true as const };
  return { db, found: await findPaymentByToken(db, String(formData.get("t") ?? "")), tooMany: false as const };
}

/** "Verificar mi pago": vuelve a preguntarle a Tilopay por el estado real del intento. */
export async function refreshPaymentAction(_previous: ResultActionState, formData: FormData): Promise<ResultActionState> {
  if (!isDatabaseConfigured()) return { message: NO_DB };
  const { db, found, tooMany } = await byToken(formData);
  if (tooMany) return { message: AUTH_MESSAGES.tooMany };
  if (!found) return { message: "No encontramos este pedido." };
  const result = await verifyPayment(db, found.paymentId, "return", { waitIfThrottled: true });
  if (result) after(() => notifyVerifyResult(db, result, String(formData.get("t") ?? "")));
  revalidatePath(routes.checkoutResult);
  if (result?.kind === "unavailable") return { message: "No pudimos consultar el pago en este momento. Probá de nuevo en unos segundos." };
  if (result?.kind === "pending") return { message: "Todavía no recibimos la confirmación del pago." };
  return null;
}

/** "Reintentar el pago": abre una página de pago (después de verificar que el intento anterior no se haya aprobado). */
export async function retryPaymentAction(_previous: ResultActionState, formData: FormData): Promise<ResultActionState> {
  if (!isDatabaseConfigured()) return { message: NO_DB };
  const { db, found, tooMany } = await byToken(formData);
  if (tooMany) return { message: AUTH_MESSAGES.tooMany };
  if (!found) return { message: "No encontramos este pedido." };
  const opened = await openPaymentSession(db, found.orderId, "return");
  if (opened.kind === "redirect") redirect(opened.url);
  if (opened.kind === "paid") {
    if (opened.verify) {
      const verify = opened.verify;
      after(() => notifyVerifyResult(db, verify, String(formData.get("t") ?? "")));
    }
    redirect(`${routes.checkoutResult}?t=${String(formData.get("t") ?? "")}`);
  }
  return { message: sessionFailure(opened) };
}

/** "Cancelar el pedido": libera el stock (solo si Tilopay confirma que no hay un pago aprobado). */
export async function cancelOrderByTokenAction(_previous: ResultActionState, formData: FormData): Promise<ResultActionState> {
  if (!isDatabaseConfigured()) return { message: NO_DB };
  const { db, found, tooMany } = await byToken(formData);
  if (tooMany) return { message: AUTH_MESSAGES.tooMany };
  if (!found) return { message: "No encontramos este pedido." };
  const outcome = await cancelOrderSafely(db, found.orderId, "return");
  revalidatePath(routes.checkoutResult);
  if (outcome === "unverifiable") return { message: "No pudimos verificar el estado del pago. Esperá unos minutos y volvé a intentar." };
  return null;
}
