export const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Transiciones permitidas entre estados de un pedido.
 *
 * PROPUESTA INICIAL — conviene validarla con management antes de implementar
 * el flujo real (por ejemplo: ¿se puede cancelar un pedido ya pagado? Aquí sí,
 * pero implica gestionar el reembolso).
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["PREPARING", "CANCELLED", "REFUNDED"],
  PREPARING: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export function isFinalOrderStatus(status: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[status].length === 0;
}

export class InvalidOrderTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Transición de pedido no permitida: ${from} → ${to}.`);
    this.name = "InvalidOrderTransitionError";
  }
}

/** Lanza `InvalidOrderTransitionError` si el cambio de estado no está permitido. */
export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) throw new InvalidOrderTransitionError(from, to);
}
