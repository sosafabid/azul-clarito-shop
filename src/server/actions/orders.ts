"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { isUuid } from "@/domain/ids";
import { ORDER_STATUSES, type OrderStatus } from "@/domain/order-status";
import { requirePermission } from "@/server/auth";
import { auditInsert, resolveAuditActor } from "@/server/services/audit";
import { FULFILLMENT_TARGETS, advanceFulfillment } from "@/server/services/orders/admin";
import { resolvePaymentReview } from "@/server/services/payments/lifecycle";
import { cancelOrderSafely, reconcilePayments } from "@/server/services/payments/reconcile";
import { notifyVerifyResult, verifyPayment } from "@/server/services/payments/verify";
import { and, eq } from "drizzle-orm";
import { payments } from "@/db/schema";

/**
 * ACCIONES DEL PANEL DE PEDIDOS (SUPER_ADMIN y STAFF con `orders:fulfill`). Cada una exige el permiso ANTES de tocar la base.
 *
 * NO existe ninguna acción para marcar un pago como aprobado a mano: un pedido pasa a PAGADO únicamente cuando Tilopay lo confirma
 * en la verificación servidor a servidor. "Verificar con Tilopay" solo PREGUNTA el estado real; no lo decide quien hace clic.
 */
export type OrderActionState = { ok: boolean; message: string } | null;
const NO_DB: OrderActionState = { ok: false, message: "La base de datos no está configurada (falta DATABASE_URL)." };

const clean = (value: FormDataEntryValue | null, max: number) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);

export async function verifyOrderPaymentAction(orderId: string): Promise<OrderActionState> {
  const session = await requirePermission("orders:fulfill");
  if (!isDatabaseConfigured()) return NO_DB;
  if (!isUuid(orderId)) return { ok: false, message: "Pedido no válido." };
  const db = getDb();
  const attempts = await db.select({ id: payments.id }).from(payments).where(and(eq(payments.orderId, orderId), eq(payments.status, "PENDING")));
  let message = "No hay intentos de pago pendientes para verificar.";
  for (const attempt of attempts) {
    const result = await verifyPayment(db, attempt.id, "admin", { waitIfThrottled: true });
    if (!result) continue;
    after(() => notifyVerifyResult(db, result));
    message = result.kind === "paid" ? "Tilopay confirmó el pago." : result.kind === "rejected" ? "Tilopay rechazó el pago." : result.kind === "review" ? "Tilopay aprobó algo que no coincide con el pedido: revisalo." : result.kind === "unavailable" ? "No se pudo consultar a Tilopay ahora. Probá en unos segundos." : "Tilopay todavía no tiene un pago aprobado para este pedido.";
  }
  await auditInsert(db, resolveAuditActor(session), [{ action: "order_payment_verified", entityType: "order", entityId: orderId, metadata: {} }]);
  revalidatePath(routes.adminOrder(orderId));
  return { ok: true, message };
}

export async function cancelPendingOrderAdminAction(orderId: string): Promise<OrderActionState> {
  const session = await requirePermission("orders:fulfill");
  if (!isDatabaseConfigured()) return NO_DB;
  if (!isUuid(orderId)) return { ok: false, message: "Pedido no válido." };
  const db = getDb();
  const outcome = await cancelOrderSafely(db, orderId, "admin", session.email);
  await auditInsert(db, resolveAuditActor(session), [{ action: "order_cancel_pending", entityType: "order", entityId: orderId, metadata: { outcome } }]);
  revalidatePath(routes.adminOrder(orderId));
  if (outcome === "paid") return { ok: false, message: "El pedido ya está pagado: no se puede cancelar desde acá." };
  if (outcome === "unverifiable") return { ok: false, message: "No se pudo verificar con Tilopay que no haya un pago: no se canceló." };
  if (outcome === "not_pending") return { ok: false, message: "El pedido ya no estaba pendiente." };
  return { ok: true, message: "Pedido cancelado y stock liberado." };
}

export async function updateFulfillmentAction(orderId: string, _previous: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const session = await requirePermission("orders:fulfill");
  if (!isDatabaseConfigured()) return NO_DB;
  if (!isUuid(orderId)) return { ok: false, message: "Pedido no válido." };
  const next = String(formData.get("next") ?? "") as OrderStatus;
  const expected = String(formData.get("expected") ?? "") as OrderStatus;
  if (!(FULFILLMENT_TARGETS as readonly string[]).includes(next) || !(ORDER_STATUSES as readonly string[]).includes(expected)) return { ok: false, message: "Estado no válido." };
  const trackingUrl = clean(formData.get("trackingUrl"), 500);
  if (trackingUrl !== "" && !/^https?:\/\//i.test(trackingUrl)) return { ok: false, message: "El enlace de seguimiento debe empezar con http:// o https://." };
  try {
    const changed = await advanceFulfillment(getDb(), {
      orderId,
      expected,
      next,
      carrier: clean(formData.get("carrier"), 80) || null,
      trackingNumber: clean(formData.get("trackingNumber"), 120) || null,
      trackingUrl: trackingUrl || null,
      actor: resolveAuditActor(session),
    });
    revalidatePath(routes.adminOrder(orderId));
    return changed ? { ok: true, message: "Pedido actualizado." } : { ok: false, message: "El pedido cambió mientras lo editabas. Recargá la página." };
  } catch {
    return { ok: false, message: "Ese cambio de estado no está permitido." };
  }
}

export async function reconcileNowAction(): Promise<OrderActionState> {
  await requirePermission("orders:fulfill");
  if (!isDatabaseConfigured()) return NO_DB;
  const summary = await reconcilePayments(getDb(), { limit: 20, source: "admin" });
  revalidatePath(routes.adminOrders);
  return { ok: true, message: `Revisados ${summary.verified} pagos pendientes (${summary.paid} confirmados), ${summary.expired} pedidos vencidos cancelados, ${summary.emailsRetried} correos reenviados.` };
}

export async function resolvePaymentReviewAction(orderId: string, _previous: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const session = await requirePermission("orders:fulfill");
  if (!isDatabaseConfigured()) return NO_DB;
  if (!isUuid(orderId)) return { ok: false, message: "Pedido no válido." };
  const note = clean(formData.get("note"), 500);
  if (note.length < 15) return { ok: false, message: "Escribí qué se hizo (mínimo 15 caracteres): por ejemplo, el reembolso en el portal de Tilopay con su número de transacción." };
  const db = getDb();
  const done = await resolvePaymentReview(db, { orderId, note, actor: session.email });
  if (!done) return { ok: false, message: "Este pedido no tiene una alerta pendiente." };
  await auditInsert(db, resolveAuditActor(session), [{ action: "order_payment_review_resolved", entityType: "order", entityId: orderId, metadata: {} }]);
  revalidatePath(routes.adminOrder(orderId));
  return { ok: true, message: "Alerta resuelta y registrada." };
}
