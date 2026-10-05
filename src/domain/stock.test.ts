import { describe, expect, it } from "vitest";
import { InsufficientStockError, commitStock, releaseStock, reserveStock } from "./stock";

const base = { availableStock: 3, reservedStock: 0, soldStock: 0 };

describe("inventario", () => {
  it("reserva mueve available → reserved", () => {
    expect(reserveStock(base, 2)).toEqual({ availableStock: 1, reservedStock: 2, soldStock: 0 });
  });

  it("no permite reservar más de lo disponible (overselling)", () => {
    expect(() => reserveStock(base, 4)).toThrow(InsufficientStockError);
  });

  it("confirmar mueve reserved → sold", () => {
    const reserved = reserveStock(base, 2);
    expect(commitStock(reserved, 2)).toEqual({ availableStock: 1, reservedStock: 0, soldStock: 2 });
  });

  it("liberar devuelve reserved → available", () => {
    const reserved = reserveStock(base, 2);
    expect(releaseStock(reserved, 2)).toEqual(base);
  });

  it("no se puede liberar ni confirmar más de lo reservado", () => {
    expect(() => releaseStock(base, 1)).toThrow(RangeError);
    expect(() => commitStock(base, 1)).toThrow(RangeError);
  });

  it("rechaza cantidades inválidas", () => {
    expect(() => reserveStock(base, 0)).toThrow(RangeError);
    expect(() => reserveStock(base, -1)).toThrow(RangeError);
    expect(() => reserveStock(base, 1.5)).toThrow(RangeError);
  });

  it("el stock total se conserva en todo el flujo", () => {
    const total = (s: typeof base) => s.availableStock + s.reservedStock + s.soldStock;
    const reserved = reserveStock(base, 3);
    expect(total(reserved)).toBe(total(base));
    expect(total(commitStock(reserved, 3))).toBe(total(base));
  });
});
