/**
 * Número de pedido legible para personas, p. ej. "AC-2026-000123".
 *
 * El consecutivo sale de una SECUENCIA de PostgreSQL (`order_number_seq`,
 * definida en el schema), no de un `count(*) + 1`, para que dos pedidos
 * simultáneos nunca obtengan el mismo número.
 */
export function formatOrderNumber(sequenceValue: number, date: Date = new Date()): string {
  if (!Number.isInteger(sequenceValue) || sequenceValue < 1) {
    throw new RangeError("El consecutivo del pedido debe ser un entero positivo.");
  }
  return `AC-${date.getFullYear()}-${String(sequenceValue).padStart(6, "0")}`;
}
