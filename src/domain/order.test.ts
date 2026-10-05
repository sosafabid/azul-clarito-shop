import { describe, expect, it } from "vitest";
import { formatOrderNumber } from "./order-number";
import {
  ORDER_STATUSES,
  assertOrderTransition,
  canTransitionOrder,
  isFinalOrderStatus,
} from "./order-status";

describe("estados de pedido", () => {
  it("permite el camino feliz completo", () => {
    expect(canTransitionOrder("PENDING", "PAID")).toBe(true);
    expect(canTransitionOrder("PAID", "PREPARING")).toBe(true);
    expect(canTransitionOrder("PREPARING", "SHIPPED")).toBe(true);
    expect(canTransitionOrder("SHIPPED", "DELIVERED")).toBe(true);
  });

  it("no permite saltarse pasos ni retroceder", () => {
    expect(canTransitionOrder("PENDING", "SHIPPED")).toBe(false);
    expect(canTransitionOrder("DELIVERED", "PENDING")).toBe(false);
    expect(() => assertOrderTransition("PENDING", "DELIVERED")).toThrow(/no permitida/);
  });

  it("CANCELLED y REFUNDED son finales", () => {
    expect(isFinalOrderStatus("CANCELLED")).toBe(true);
    expect(isFinalOrderStatus("REFUNDED")).toBe(true);
    expect(isFinalOrderStatus("PAID")).toBe(false);
  });

  it("todos los estados tienen una entrada de transiciones", () => {
    for (const status of ORDER_STATUSES) {
      expect(() => isFinalOrderStatus(status)).not.toThrow();
    }
  });
});

describe("número de pedido", () => {
  it("rellena a 6 dígitos con el año", () => {
    expect(formatOrderNumber(123, new Date("2026-10-05T00:00:00"))).toBe("AC-2026-000123");
  });

  it("rechaza consecutivos inválidos", () => {
    expect(() => formatOrderNumber(0)).toThrow(RangeError);
    expect(() => formatOrderNumber(1.5)).toThrow(RangeError);
  });
});
