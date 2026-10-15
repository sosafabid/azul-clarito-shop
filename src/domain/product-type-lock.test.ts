import { describe, expect, it } from "vitest";
import { evaluateTypeLock, type TypeLockOrder } from "./product-type-lock";

const NOW = new Date("2026-10-15T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);
const order = (over: Partial<TypeLockOrder> = {}): TypeLockOrder => ({
  orderNumber: "AC-2026-000001", status: "CANCELLED", paidAt: null, refundedAt: null, cancelledAt: hoursAgo(200), paymentReviewReason: null,
  hasConfirmationEvent: false, payments: [{ status: "CANCELLED", paidAt: null, sessionRequestedAt: hoursAgo(201) }], ...over,
});
const check = (orders: TypeLockOrder[], soldStock = 0) => evaluateTypeLock({ orders, soldStock }, NOW);

describe("cambio de tipo de producto", () => {
  it("sin pedidos: se permite", () => expect(check([]).locked).toBe(false));
  it("todos los pedidos cancelados (hace más de 72 h) y pagos cancelados: se permite", () => {
    expect(check([order(), order({ orderNumber: "AC-2026-000002", payments: [{ status: "FAILED", paidAt: null, sessionRequestedAt: null }] })]).locked).toBe(false);
  });
  it("pedido cancelado sin pagos: se permite", () => expect(check([order({ payments: [] })]).locked).toBe(false));
  it.each(["PENDING", "PAID", "PREPARING", "PACKED", "SHIPPED", "DELIVERED", "REFUNDED"])("pedido %s: se bloquea", (status) => {
    const r = check([order({ status })]);
    expect(r.locked).toBe(true);
    expect(r.reasons).toContain("active_order");
    expect(r.blockingOrders).toEqual(["AC-2026-000001"]);
  });
  it("pedido cancelado pero con pago PAID (cobro tardío): se bloquea aunque la pantalla diga cancelado", () => {
    const r = check([order({ payments: [{ status: "PAID", paidAt: hoursAgo(1), sessionRequestedAt: hoursAgo(2) }] })]);
    expect(r.reasons).toContain("payment_confirmed");
  });
  it("pago con paid_at aunque su estado no sea PAID: se bloquea", () => {
    expect(check([order({ payments: [{ status: "CANCELLED", paidAt: hoursAgo(300), sessionRequestedAt: null }] })]).reasons).toContain("payment_confirmed");
  });
  it("pedido con paid_at, refunded_at o evento de pago confirmado: se bloquea", () => {
    expect(check([order({ paidAt: hoursAgo(300) })]).reasons).toContain("payment_confirmed");
    expect(check([order({ refundedAt: hoursAgo(300) })]).reasons).toContain("payment_confirmed");
    expect(check([order({ hasConfirmationEvent: true })]).reasons).toContain("payment_confirmed");
  });
  it("pago pendiente o en proceso en un pedido cancelado: se bloquea", () => {
    expect(check([order({ payments: [{ status: "PENDING", paidAt: null, sessionRequestedAt: hoursAgo(300) }] })]).reasons).toContain("payment_pending");
  });
  it("estado de pago desconocido: se bloquea por prudencia", () => {
    expect(check([order({ payments: [{ status: "AUTHORIZED", paidAt: null, sessionRequestedAt: null }] })]).locked).toBe(true);
  });
  it("pago reembolsado: se bloquea", () => {
    expect(check([order({ payments: [{ status: "REFUNDED", paidAt: null, sessionRequestedAt: null }] })]).reasons).toContain("payment_refunded");
  });
  it("alerta de revisión de pago abierta: se bloquea", () => {
    expect(check([order({ paymentReviewReason: "Se aprobó un pago cuando el pedido ya estaba cancelado" })]).reasons).toContain("payment_review");
  });
  it("cancelado hace menos de 72 h con sesión de pago abierta: se bloquea (cobro tardío posible); pasado ese plazo, se libera", () => {
    const recent = order({ cancelledAt: hoursAgo(10) });
    expect(check([recent]).reasons).toEqual(["payment_watch"]);
    expect(check([order({ cancelledAt: hoursAgo(10), payments: [{ status: "CANCELLED", paidAt: null, sessionRequestedAt: null }] })]).locked).toBe(false);
    expect(check([order({ cancelledAt: hoursAgo(73) })]).locked).toBe(false);
  });
  it("unidades vendidas en inventario: se bloquea", () => expect(check([order()], 2).reasons).toEqual(["sold_stock"]));
  it("un solo pedido activo entre varios cancelados basta para bloquear, y se indica cuál", () => {
    const r = check([order(), order({ orderNumber: "AC-2026-000009", status: "PAID" })]);
    expect(r.locked).toBe(true);
    expect(r.blockingOrders).toEqual(["AC-2026-000009"]);
    expect(r.message).toMatch(/No se puede cambiar el tipo/);
  });
});
