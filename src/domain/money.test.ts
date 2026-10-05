import { describe, expect, it } from "vitest";
import { formatMoney, fromMinorUnits, toMinorUnits } from "./money";

describe("formatMoney", () => {
  it("formatea colones con punto de miles y sin decimales", () => {
    expect(formatMoney(12000, "CRC")).toBe("₡12.000");
    expect(formatMoney(1234567, "CRC")).toBe("₡1.234.567");
    expect(formatMoney(0, "CRC")).toBe("₡0");
  });

  it("formatea dólares con coma decimal", () => {
    expect(formatMoney(123450, "USD")).toBe("$1.234,50");
    expect(formatMoney(5, "USD")).toBe("$0,05");
  });

  it("maneja negativos", () => {
    expect(formatMoney(-2500, "CRC")).toBe("-₡2.500");
  });

  it("convierte hacia y desde la unidad mínima", () => {
    expect(toMinorUnits(12.5, "USD")).toBe(1250);
    expect(fromMinorUnits(1250, "USD")).toBe(12.5);
    expect(toMinorUnits(12000, "CRC")).toBe(12000);
  });
});
