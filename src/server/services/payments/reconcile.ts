import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { after } from "next/server";
import type { Database } from "@/db/client";
import { orders, payments } from "@/db/schema";
import { cancelPendingOrder, flagForReview, type PaymentSource } from "./lifecycle";
import { notifyVerifyResult, verifyPayment } from "./verify";
import { retryFailedEmails, sendOrderEmail } from "@/server/services/orders/notify";

/**
 * CONCILIACIÓN y RECUPERACIÓN. Existe porque el navegador puede no volver nunca (cierra la pestaña, pierde conexión) y porque
 * no hay un webhook con contrato público verificado: la verdad se pregunta a Tilopay.
 *
 *  1. Intentos pendientes con sesión abierta → se consultan y se aplican.
 *  2. Reservas vencidas → antes de liberar el stock se consulta TODO intento del pedido; solo si ninguno se pagó (o el proveedor
 *     confirma que no hay transacción) se cancela el pedido y se libera el stock. Si el proveedor no responde, se espera hasta
 *     `GRACE_HOURS` después del vencimiento y recién entonces se cancela dejando el pedido marcado para revisión.
 *  3. Correos que fallaron → se reintentan.
 *
 * Todo es idempotente: se puede ejecutar a la vez desde la tarea programada, el panel o una visita al checkout.
 */
const GRACE_HOURS = 24;

export type ReconcileSummary = { verified: number; paid: number; expired: number; deferred: number; emailsRetried: number };

export type SettleResult = "paid" | "cancelled" | "deferred" | "not_pending";

/** Resuelve un pedido PENDIENTE cuya reserva venció: ¿se pagó o hay que liberar el stock? */
export async function settleExpiredOrder(db: Database, orderId: string, source: PaymentSource = "expiry"): Promise<SettleResult> {
  const [order] = await db.select({ status: orders.status }).from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.status !== "PENDING") return order?.status === "PAID" ? "paid" : "not_pending";

  const attempts = await db.select().from(payments).where(and(eq(payments.orderId, orderId), inArray(payments.status, ["PENDING", "FAILED", "CANCELLED"])));
  let inconclusive = false;
  for (const attempt of attempts) {
    if (!attempt.sessionRequestedAt || !attempt.providerOrderNumber) continue; // nunca llegó a Tilopay
    const result = await verifyPayment(db, attempt.id, source, { waitIfThrottled: true });
    if (!result) continue;
    if (result.kind === "paid") {
      await notifyVerifyResult(db, result);
      return "paid";
    }
    if (result.kind === "review") return "deferred";
    if (result.kind === "unavailable" && attempt.status === "PENDING") inconclusive = true;
  }
  if (inconclusive) {
    const [late] = await db.execute(sql`
      select 1 as late from inventory_reservations where order_id = ${orderId}::uuid and status = 'ACTIVE' and expires_at < now() - make_interval(hours => ${GRACE_HOURS}::int) limit 1
    `).then((r) => r.rows as { late: number }[]);
    if (!late) return "deferred";
    await flagForReview(db, orderId, "El pedido venció y Tilopay no respondió a la verificación: se canceló por seguridad. Revisar en el portal de Tilopay si hubo un cobro.");
  }
  const cancelled = await cancelPendingOrder(db, { orderId, reason: inconclusive ? "verification_unavailable" : "expired", source });
  if (cancelled) await sendOrderEmail(db, { orderId, event: "order_cancelled" });
  return cancelled ? "cancelled" : "not_pending";
}

export type SweepSummary = { found: number; cancelled: number; deferred: number; paid: number };

/**
 * Resuelve las reservas VENCIDAS (30 min) sin esperar a la tarea diaria. Se llama desde: la tarea programada, el panel, la visita al
 * checkout (en segundo plano) y, sobre todo, cuando una compra choca contra "sin stock" (así una reserva vencida nunca deja sin
 * unidades a otra clienta). Antes de liberar, SIEMPRE se verifica el pago con Tilopay (`settleExpiredOrder`).
 */
export async function settleExpiredOrders(db: Database, options: { limit?: number; source?: PaymentSource } = {}): Promise<SweepSummary> {
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);
  const out: SweepSummary = { found: 0, cancelled: 0, deferred: 0, paid: 0 };
  const expired = await db.execute(sql`
    select o.id from orders o
     where o.status = 'PENDING' and o.payment_review_reason is null
       and exists (select 1 from inventory_reservations r where r.order_id = o.id and r.status = 'ACTIVE' and r.expires_at < now())
     order by o.placed_at asc limit ${limit}::int
  `);
  out.found = expired.rows.length;
  for (const row of expired.rows as { id: string }[]) {
    const result = await settleExpiredOrder(db, row.id, options.source ?? "expiry");
    if (result === "cancelled") out.cancelled += 1;
    else if (result === "deferred") out.deferred += 1;
    else if (result === "paid") out.paid += 1;
  }
  return out;
}

export async function reconcilePayments(db: Database, options: { limit?: number; source?: PaymentSource } = {}): Promise<ReconcileSummary> {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
  const source = options.source ?? "reconcile";
  const summary: ReconcileSummary = { verified: 0, paid: 0, expired: 0, deferred: 0, emailsRetried: 0 };

  // 1) intentos pendientes con sesión abierta hace más de 2 minutos
  const pending = await db.execute(sql`
    select p.id from payments p join orders o on o.id = p.order_id
     where p.status = 'PENDING' and p.session_requested_at is not null and o.status = 'PENDING'
       and p.session_requested_at < now() - interval '2 minutes'
       and (p.last_checked_at is null or p.last_checked_at < now() - interval '2 minutes')
     order by p.session_requested_at asc limit ${limit}::int
  `);
  for (const row of pending.rows as { id: string }[]) {
    const result = await verifyPayment(db, row.id, source);
    if (!result) continue;
    summary.verified += 1;
    if (result.kind === "paid" && result.changed) summary.paid += 1;
    await notifyVerifyResult(db, result);
  }

  // 1b) intentos de pedidos YA cancelados: la página de pago de Tilopay puede seguir abierta y la clienta pagar después sin volver al sitio.
  //     Se vigilan 72 h tras la cancelación (cada 15 min las primeras 3 h; cada 6 h después). Un cobro así NO reactiva el pedido: queda
  //     marcado para revisión y avisa al equipo (ver `confirmPayment`).
  const watched = await db.execute(sql`
    select p.id from payments p join orders o on o.id = p.order_id
     where p.status = 'CANCELLED' and p.session_requested_at is not null and o.status = 'CANCELLED' and o.cancelled_at > now() - interval '72 hours'
       and (
         (o.cancelled_at > now() - interval '3 hours' and (p.last_checked_at is null or p.last_checked_at < now() - interval '15 minutes'))
         or (p.last_checked_at is null or p.last_checked_at < now() - interval '6 hours')
       )
     order by o.cancelled_at desc limit ${limit}::int
  `);
  for (const row of watched.rows as { id: string }[]) {
    const result = await verifyPayment(db, row.id, source);
    if (!result) continue;
    summary.verified += 1;
    if (result.kind === "paid" && result.changed) summary.paid += 1;
    await notifyVerifyResult(db, result);
  }

  // 2) reservas vencidas de pedidos pendientes (sin alerta de revisión)
  const swept = await settleExpiredOrders(db, { limit, source: source === "reconcile" ? "expiry" : source });
  summary.expired += swept.cancelled;
  summary.deferred += swept.deferred;
  summary.paid += swept.paid;

  // 3) correos pendientes de reintento
  summary.emailsRetried = await retryFailedEmails(db, limit);
  return summary;
}

export type CancelOutcome = "cancelled" | "paid" | "unverifiable" | "not_pending";

/**
 * Cancelación pedida por la clienta (o el equipo) de un pedido PENDIENTE. Antes de liberar el stock se verifica con el proveedor
 * que ningún intento haya sido aprobado: nunca se cancela un pedido que en realidad se pagó.
 */
export async function cancelOrderSafely(db: Database, orderId: string, source: PaymentSource, actor?: string): Promise<CancelOutcome> {
  const [order] = await db.select({ status: orders.status }).from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return "not_pending";
  if (order.status === "PAID") return "paid";
  if (order.status !== "PENDING") return "not_pending";

  const attempts = await db.select().from(payments).where(and(eq(payments.orderId, orderId), eq(payments.status, "PENDING")));
  for (const attempt of attempts) {
    if (!attempt.sessionRequestedAt || !attempt.providerOrderNumber) continue;
    const result = await verifyPayment(db, attempt.id, source, { waitIfThrottled: true });
    if (!result) continue;
    if (result.kind === "paid") {
      await notifyVerifyResult(db, result);
      return "paid";
    }
    if (result.kind === "unavailable" || result.kind === "review") return "unverifiable";
  }
  const cancelled = await cancelPendingOrder(db, { orderId, reason: source === "admin" ? "admin_cancelled" : "customer_cancelled", source, actor });
  return cancelled ? "cancelled" : "not_pending";
}

// ── Liberación oportunista (productos, carrito, checkout) ─────────────────────────────────────────────────────────────────
//
// Una reserva vencida no debe mantener un producto "agotado" falsamente. Las pantallas que muestran o validan disponibilidad
// llaman a `releaseExpiredReservations` ANTES de leer el inventario. Reutiliza `settleExpiredOrders` → `settleExpiredOrder`, por lo
// que NUNCA se libera sin consultar antes a Tilopay, y la liberación es atómica e idempotente (`cancelPendingOrder` es una sola
// sentencia protegida por `status = 'PENDING'`: si dos visitas coinciden, solo una libera el stock).
//
// Freno por instancia: sin reservas vencidas, la comprobación (una consulta con índice parcial) se hace como máximo cada 5 s; si había
// reservas pero no se pudo resolver (Tilopay no responde), se espera 60 s para no frenar las páginas. La espera máxima por página es 3 s.
const IDLE_CHECK_MS = 5_000;
const STUCK_BACKOFF_MS = 60_000;
const PAGE_WAIT_MS = 3_000;
const FULL_RECONCILE_MS = 60_000;
let nextSweepAt = 0;
let nextFullReconcileAt = 0;

/** Solo para pruebas: reinicia los frenos. */
export function resetSweepThrottle(): void {
  nextSweepAt = 0;
  nextFullReconcileAt = 0;
}

export async function releaseExpiredReservations(db: Database): Promise<void> {
  const now = Date.now();
  if (now < nextSweepAt) return;
  nextSweepAt = now + IDLE_CHECK_MS;
  try {
    const work = settleExpiredOrders(db, { limit: 5, source: "expiry" })
      .then((summary) => {
        if (summary.found > 0 && summary.cancelled + summary.paid === 0) nextSweepAt = Date.now() + STUCK_BACKOFF_MS;
        else if (summary.found > 0) nextSweepAt = 0; // había trabajo y se resolvió: la próxima visita vuelve a mirar
      })
      .catch(() => {
        nextSweepAt = Date.now() + STUCK_BACKOFF_MS;
      });
    await Promise.race([work, new Promise<void>((resolve) => setTimeout(resolve, PAGE_WAIT_MS).unref?.())]);
    scheduleFullReconcile(db);
  } catch {
    /* una falla aquí nunca debe romper una página de la tienda */
  }
}

/** Conciliación completa (pagos sin retorno, correos pendientes) en segundo plano, como máximo una vez por minuto por instancia. */
function scheduleFullReconcile(db: Database): void {
  const now = Date.now();
  if (now < nextFullReconcileAt) return;
  nextFullReconcileAt = now + FULL_RECONCILE_MS;
  try {
    after(() => reconcilePayments(db, { limit: 10, source: "reconcile" }).then(() => undefined).catch(() => undefined));
  } catch {
    /* fuera de una petición (scripts) no hay `after`: la tarea programada lo cubre */
  }
}
