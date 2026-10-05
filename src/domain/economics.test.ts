import { describe, expect, it } from "vitest";
import { formatPercent, inventoryEconomics, marginFromTotals, unitEconomics } from "./product-economics";
import { parseMoneyInput } from "./money";
import { slugify } from "./slug";

describe("unitEconomics (utilidad bruta por unidad y margen)", () => {
  it("calcula ganancia y margen con los datos del ejemplo", () => {
    const e = unitEconomics(12000, 5000);
    expect(e.grossProfitPerUnit).toBe(7000);
    expect(e.marginPercent).toBeCloseTo(58.333, 2);
    expect(e.isLoss).toBe(false);
  });

  it("detecta venta con pérdida (margen negativo)", () => {
    const e = unitEconomics(4000, 5000);
    expect(e.grossProfitPerUnit).toBe(-1000);
    expect(e.marginPercent).toBe(-25);
    expect(e.isLoss).toBe(true);
  });

  it("precio igual al costo: margen 0 y NO es pérdida", () => {
    const e = unitEconomics(5000, 5000);
    expect(e.marginPercent).toBe(0);
    expect(e.isLoss).toBe(false);
  });

  it("sin costo no inventa margen", () => {
    const e = unitEconomics(12000, null);
    expect(e).toEqual({ costKnown: false, grossProfitPerUnit: null, marginPercent: null, isLoss: false });
  });

  it("precio 0 no divide por cero", () => {
    expect(unitEconomics(0, 1000).marginPercent).toBeNull();
    expect(unitEconomics(0, 1000).isLoss).toBe(true);
  });
});

describe("inventoryEconomics", () => {
  it("valor al costo, valor potencial de venta y utilidad potencial", () => {
    expect(inventoryEconomics({ availableStock: 10, price: 12000, cost: 5000 })).toEqual({
      inventoryValueAtCost: 50000,
      potentialSalesValue: 120000,
      potentialProfit: 70000,
    });
  });

  it("sin costo, el valor al costo y la utilidad quedan sin calcular", () => {
    const e = inventoryEconomics({ availableStock: 10, price: 12000, cost: null });
    expect(e.inventoryValueAtCost).toBeNull();
    expect(e.potentialProfit).toBeNull();
    expect(e.potentialSalesValue).toBe(120000);
  });
});

describe("margen agregado y formato", () => {
  it("marginFromTotals", () => {
    expect(marginFromTotals(100000, 40000)).toBe(60);
    expect(marginFromTotals(0, 0)).toBeNull();
  });
  it("formatPercent usa coma decimal", () => {
    expect(formatPercent(58.333)).toBe("58,3%");
    expect(formatPercent(-25)).toBe("-25,0%");
    expect(formatPercent(null)).toBe("—");
  });
});

describe("parseMoneyInput", () => {
  it("CRC acepta enteros y formato con puntos de miles", () => {
    expect(parseMoneyInput("12000", "CRC")).toEqual({ ok: true, amount: 12000 });
    expect(parseMoneyInput("12.000", "CRC")).toEqual({ ok: true, amount: 12000 });
    expect(parseMoneyInput("₡1.234.567", "CRC")).toEqual({ ok: true, amount: 1234567 });
  });

  it("CRC rechaza decimales y ambigüedades (nunca lee 12.5 como 12 ni 125)", () => {
    for (const bad of ["12,5", "12.5", "12.50", "abc", "", "-100", "12.00"]) {
      expect(parseMoneyInput(bad, "CRC").ok).toBe(false);
    }
  });

  it("USD acepta centavos con punto o coma", () => {
    expect(parseMoneyInput("12.5", "USD")).toEqual({ ok: true, amount: 1250 });
    expect(parseMoneyInput("12,50", "USD")).toEqual({ ok: true, amount: 1250 });
    expect(parseMoneyInput("1.234,50", "USD")).toEqual({ ok: true, amount: 123450 });
    expect(parseMoneyInput("12", "USD")).toEqual({ ok: true, amount: 1200 });
  });
});

describe("slugify", () => {
  it("quita tildes y símbolos", () => {
    expect(slugify("Camiseta Azul — Edición Limitada")).toBe("camiseta-azul-edicion-limitada");
    expect(slugify("  ¡Hola, Mar!  ")).toBe("hola-mar");
  });
});
