/**
 * ¿Se puede cambiar el TIPO de un producto (físico ↔ digital)? Una sola regla, usada por el servidor (que decide) y por el formulario
 * (que lo explica). El tipo condiciona la entrega (envío o descarga) de lo ya vendido, así que solo se libera cuando NINGÚN pedido
 * del producto puede generar una entrega o una obligación pendiente.
 *
 * Se permite si, para TODOS los pedidos que contienen el producto:
 *   - el pedido está CANCELLED;
 *   - ningún pago está en PENDING, PAID o REFUNDED, ni tiene `paid_at` (el estado que muestra la pantalla no basta: un cobro tardío
 *     deja el pedido CANCELLED pero el pago PAID);
 *   - el pedido no tiene `paid_at`, `refunded_at` ni una alerta de revisión de pago abierta, ni eventos de pago confirmado;
 *   - no hay un pago cancelado con sesión abierta en Tilopay dentro de la ventana de vigilancia de cobros tardíos (72 h desde la
 *     cancelación): hasta que pase, aún podría llegar un cobro.
 * Además el inventario no debe registrar unidades vendidas (`sold_stock > 0`).
 * Nunca se modifica el historial: esta regla solo lee.
 */
export const LATE_PAYMENT_WATCH_HOURS = 72;

export const TYPE_LOCK_REASONS = [
  "active_order",
  "payment_confirmed",
  "payment_pending",
  "payment_refunded",
  "payment_review",
  "payment_watch",
  "sold_stock",
] as const;
export type TypeLockReason = (typeof TYPE_LOCK_REASONS)[number];

export type TypeLockPayment = { status: string; paidAt: Date | null; sessionRequestedAt: Date | null };
export type TypeLockOrder = {
  orderNumber: string;
  status: string;
  paidAt: Date | null;
  refundedAt: Date | null;
  cancelledAt: Date | null;
  paymentReviewReason: string | null;
  /** Hay un evento `payment_confirmed*` registrado para el pedido. */
  hasConfirmationEvent: boolean;
  payments: TypeLockPayment[];
};
export type TypeLockFacts = { orders: TypeLockOrder[]; soldStock: number };

export type TypeLockResult = {
  locked: boolean;
  reasons: TypeLockReason[];
  /** Pedidos que causan el bloqueo, para mostrarlos a quien administra. */
  blockingOrders: string[];
  /** Texto para el formulario y para el error del servidor (vacío si no hay bloqueo). */
  message: string;
};

const REASON_TEXT: Record<TypeLockReason, string> = {
  active_order: "hay pedidos que no están cancelados",
  payment_confirmed: "hay pagos confirmados o capturados",
  payment_pending: "hay pagos pendientes o en proceso",
  payment_refunded: "hay pagos reembolsados",
  payment_review: "hay pagos que requieren revisión",
  payment_watch: "un pedido se canceló hace menos de 72 h con un pago iniciado (aún podría llegar un cobro tardío)",
  sold_stock: "el inventario registra unidades vendidas",
};

export function evaluateTypeLock(facts: TypeLockFacts, now: Date = new Date()): TypeLockResult {
  const reasons = new Set<TypeLockReason>();
  const blocking = new Set<string>();
  const windowMs = LATE_PAYMENT_WATCH_HOURS * 3_600_000;
  const flag = (order: TypeLockOrder, reason: TypeLockReason) => {
    reasons.add(reason);
    blocking.add(order.orderNumber);
  };

  for (const order of facts.orders) {
    if (order.status !== "CANCELLED") flag(order, "active_order");
    if (order.paidAt || order.refundedAt || order.hasConfirmationEvent) flag(order, "payment_confirmed");
    if (order.paymentReviewReason) flag(order, "payment_review");
    for (const payment of order.payments) {
      if (payment.status === "PAID" || payment.paidAt) flag(order, "payment_confirmed");
      else if (payment.status === "PENDING") flag(order, "payment_pending");
      else if (payment.status === "REFUNDED") flag(order, "payment_refunded");
      else if (payment.status === "CANCELLED" && payment.sessionRequestedAt) {
        // Sin fecha de cancelación no se puede descartar un cobro tardío: se trata como dentro de la ventana.
        const inWindow = !order.cancelledAt || now.getTime() - order.cancelledAt.getTime() < windowMs;
        if (inWindow) flag(order, "payment_watch");
      } else if (payment.status !== "CANCELLED" && payment.status !== "FAILED") {
        // Estado desconocido: ante la duda, se bloquea.
        flag(order, "payment_pending");
      }
    }
  }
  if (facts.soldStock > 0) reasons.add("sold_stock");

  const list = TYPE_LOCK_REASONS.filter((r) => reasons.has(r));
  return {
    locked: list.length > 0,
    reasons: list,
    blockingOrders: [...blocking].sort(),
    message: list.length === 0 ? "" : `No se puede cambiar el tipo: ${list.map((r) => REASON_TEXT[r]).join("; ")}.`,
  };
}
