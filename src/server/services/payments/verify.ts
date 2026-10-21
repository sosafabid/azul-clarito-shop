import "server-only";
import { eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { orders, payments } from "@/db/schema";
import { toCurrency } from "@/domain/money";
import { evaluateConsult } from "@/domain/tilopay";
import { consultOrder, TilopayError } from "@/server/payments/tilopay/client";
import { readTilopayConfig } from "@/server/payments/tilopay/config";
import { sendDigitalDelivery, sendOrderEmail } from "@/server/services/orders/notify";
import { confirmPayment, flagForReview, recordPaymentEvent, rejectPayment, type PaymentSource } from "./lifecycle";

/**
 * VERIFICAR UN PAGO con el proveedor (servidor a servidor, `POST /api/v1/consult`).
 *
 * Es la ÚNICA puerta por la que un pago pasa a PAID. Lo que traiga el navegador al volver (código, monto, estado, OrderHash)
 * NUNCA llega aquí: solo sirve para saber QUÉ intento verificar. El resultado de la consulta se compara contra el pedido
 * guardado en nuestra base (número, monto, moneda, ambiente) antes de confirmar nada.
 *
 * Es idempotente: verificar un pago ya confirmado no consulta ni cambia nada, y confirmar dos veces solo surte efecto una vez.
 */
export type VerifyOutcome =
  | { kind: "paid"; changed: boolean; orderChanged: boolean }
  | { kind: "rejected"; changed: boolean }
  | { kind: "pending" } //  el proveedor aún no conoce una transacción aprobada para este intento
  | { kind: "review" } //   aprobó algo que no coincide (monto/moneda/ambiente): queda para revisión humana
  | { kind: "unavailable" }; // sin configuración, sin respuesta del proveedor o consulta repetida demasiado pronto

export type VerifyResult = VerifyOutcome & { orderId: string; paymentId: string; attempt: number };

const MIN_SECONDS_BETWEEN_CHECKS = 3;

export type VerifyOptions = {
  /** Para acciones de una persona (cancelar, reintentar, "verificar"): si se consultó hace instantes, espera el pequeño plazo en vez de rendirse. */
  waitIfThrottled?: boolean;
};

export async function verifyPayment(db: Database, paymentId: string, source: PaymentSource, options: VerifyOptions = {}): Promise<VerifyResult | null> {
  const [row] = await db
    .select({
      id: payments.id,
      orderId: payments.orderId,
      status: payments.status,
      attempt: payments.attempt,
      providerOrderNumber: payments.providerOrderNumber,
      amount: orders.total,
      currency: orders.currency,
    })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .where(eq(payments.id, paymentId))
    .limit(1);
  if (!row || !row.providerOrderNumber) return null;
  const base = { orderId: row.orderId, paymentId: row.id, attempt: row.attempt };
  if (row.status === "PAID") return { ...base, kind: "paid", changed: false, orderChanged: false };

  const state = readTilopayConfig();
  if (!state.ok) return { ...base, kind: "unavailable" };

  // Freno: una sola consulta cada pocos segundos por intento (protege a Tilopay y evita ráfagas desde un enlace público).
  const claimCheck = async () =>
    (
      await db.execute(sql`
        update payments set last_checked_at = now()
         where id = ${paymentId}::uuid and (last_checked_at is null or last_checked_at < now() - make_interval(secs => ${MIN_SECONDS_BETWEEN_CHECKS}::int))
        returning id
      `)
    ).rows.length > 0;
  if (!(await claimCheck())) {
    if (!options.waitIfThrottled) return { ...base, kind: "unavailable" };
    await new Promise((resolve) => setTimeout(resolve, (MIN_SECONDS_BETWEEN_CHECKS + 0.3) * 1000));
    if (!(await claimCheck())) return { ...base, kind: "unavailable" };
  }

  let items;
  try {
    items = await consultOrder(state.config, row.providerOrderNumber);
  } catch (error) {
    await recordPaymentEvent(db, { orderId: row.orderId, paymentId, source, type: "verify_error", detail: { kind: error instanceof TilopayError ? error.kind : "unknown" } });
    return { ...base, kind: "unavailable" };
  }

  const verdict = evaluateConsult(items, { orderNumber: row.providerOrderNumber, amountMinor: row.amount, currency: toCurrency(row.currency) }, state.config.mode);
  switch (verdict.kind) {
    case "approved": {
      const result = await confirmPayment(db, { paymentId, providerReference: verdict.providerId, code: "1", message: verdict.message, environment: verdict.environment, source });
      if (!result.applied && result.reason === "reference_conflict") {
        await flagForReview(db, row.orderId, "Tilopay aprobó este intento con una referencia de transacción que ya está registrada en otro pago: revisar en el portal de Tilopay.");
        await recordPaymentEvent(db, { orderId: row.orderId, paymentId, source, type: "verify_reference_conflict" });
        return { ...base, kind: "review" };
      }
      return { ...base, kind: "paid", changed: result.applied, orderChanged: result.applied && result.orderChanged };
    }
    case "rejected": {
      const changed = await rejectPayment(db, { paymentId, providerReference: verdict.providerId, code: verdict.code, message: verdict.message, environment: verdict.environment, source });
      return { ...base, kind: "rejected", changed };
    }
    case "mismatch": {
      await flagForReview(db, row.orderId, `Tilopay aprobó una transacción que no coincide con el pedido (${verdict.reasons.join(", ")}): NO se confirmó. Revisar en el portal de Tilopay.`);
      await recordPaymentEvent(db, { orderId: row.orderId, paymentId, source, type: "verify_mismatch", detail: { reasons: verdict.reasons, code: verdict.code, environment: verdict.environment, providerId: verdict.providerId } });
      return { ...base, kind: "review" };
    }
    default:
      await recordPaymentEvent(db, { orderId: row.orderId, paymentId, source, type: "verify_not_found", detail: { expected: row.providerOrderNumber, received: items.slice(0, 5).map((i) => i.orderNumber.slice(0, 60)), count: items.length } });
      return { ...base, kind: "pending" };
  }
}

/** Envía los correos que corresponden al resultado (idempotente: cada evento se reclama una sola vez). */
export async function notifyVerifyResult(db: Database, result: VerifyResult, token?: string | null): Promise<void> {
  if (result.kind === "paid" && result.changed && result.orderChanged) {
    await sendOrderEmail(db, { orderId: result.orderId, event: "payment_confirmed", token });
    await sendOrderEmail(db, { orderId: result.orderId, event: "admin_new_order" });
    // Libros digitales: los enlaces salen SOLO aquí, cuando el servidor confirmó el pago con Tilopay (no al volver a la página de éxito).
    await sendDigitalDelivery(db, result.orderId, token);
  } else if (result.kind === "paid" && result.changed) {
    // Cobro aprobado en un pedido que YA no estaba pendiente (cancelado/vencido) o ya pagado: NO se le dice a la clienta "pago confirmado";
    // se avisa al equipo para que lo resuelva (reembolso o reactivación) y el pedido queda marcado para revisión.
    await sendOrderEmail(db, { orderId: result.orderId, event: "admin_payment_review", key: `payment_review:${result.paymentId}` });
  } else if (result.kind === "rejected" && result.changed) {
    await sendOrderEmail(db, { orderId: result.orderId, event: "payment_failed", key: `payment_failed:${result.attempt}`, token });
  }
}
