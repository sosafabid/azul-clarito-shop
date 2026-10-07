import { describe, expect, it } from "vitest";
import {
  CART_TOKEN_PATTERN,
  MAX_QUANTITY_PER_LINE,
  limitMessage,
  limitQuantity,
  lineKey,
  lineStatus,
  maxPurchasable,
  mergedQuantity,
  parseQuantity,
  subtotal,
  variantLabel,
  totalUnits,
} from "./cart";

describe("cantidad", () => {
  it("acepta enteros de 1 en adelante (texto o número)", () => {
    expect(parseQuantity("1")).toEqual({ ok: true, value: 1 });
    expect(parseQuantity(" 7 ")).toEqual({ ok: true, value: 7 });
    expect(parseQuantity(3)).toEqual({ ok: true, value: 3 });
  });
  it.each(["0", "-1", "1.5", "1,5", "abc", "", " ", "1e3", "+2", "0x10", "٣"])("rechaza %j", (raw) => {
    expect(parseQuantity(raw).ok).toBe(false);
  });
  it("rechaza no-números y valores absurdos", () => {
    expect(parseQuantity(NaN).ok).toBe(false);
    expect(parseQuantity(Infinity).ok).toBe(false);
    expect(parseQuantity(null).ok).toBe(false);
    expect(parseQuantity(undefined).ok).toBe(false);
    expect(parseQuantity("1000").ok).toBe(false);
  });
});

describe("límite por stock y por máximo", () => {
  it("no limita si hay de sobra", () => expect(limitQuantity(3, 10)).toEqual({ quantity: 3, limited: false }));
  it("disponible 5, pide 7 → 5 por stock", () => expect(limitQuantity(7, 5)).toEqual({ quantity: 5, limited: true, by: "stock" }));
  it("hay 500 pero el máximo por línea manda", () => expect(limitQuantity(50, 500)).toEqual({ quantity: MAX_QUANTITY_PER_LINE, limited: true, by: "max" }));
  it("sin stock el tope es 0", () => {
    expect(maxPurchasable(0)).toBe(0);
    expect(maxPurchasable(-3)).toBe(0);
    expect(limitQuantity(1, 0)).toMatchObject({ quantity: 0, limited: true });
  });
  it("mensajes claros", () => {
    expect(limitMessage({ quantity: 5, limited: true, by: "stock" })).toBe("Solo hay 5 unidades disponibles. Dejamos 5 en tu carrito.");
    expect(limitMessage({ quantity: 1, limited: true, by: "stock" })).toMatch(/Solo hay 1 unidad disponible/);
    expect(limitMessage({ quantity: 20, limited: true, by: "max" })).toMatch(/máximo por producto es 20/);
  });
});

describe("estado de la línea", () => {
  it("ok / insufficient / unavailable", () => {
    expect(lineStatus({ purchasable: true, available: 5, quantity: 5 })).toBe("ok");
    expect(lineStatus({ purchasable: true, available: 3, quantity: 5 })).toBe("insufficient");
    expect(lineStatus({ purchasable: true, available: 0, quantity: 1 })).toBe("unavailable");
    expect(lineStatus({ purchasable: false, available: 50, quantity: 1 })).toBe("unavailable");
  });
});

describe("subtotal y contador", () => {
  const lines = [
    { status: "ok" as const, unitPrice: 12000, quantity: 2 },
    { status: "ok" as const, unitPrice: 5000, quantity: 3 },
    { status: "unavailable" as const, unitPrice: 99999, quantity: 1 },
    { status: "insufficient" as const, unitPrice: 7000, quantity: 9 },
  ];
  it("suma precio × cantidad solo de las líneas que se pueden comprar", () => expect(subtotal(lines)).toBe(24000 + 15000));
  it("el contador cuenta unidades, no productos distintos (A×2 + B×3 = 5)", () => expect(totalUnits(lines.slice(0, 2))).toBe(5));
  it("carrito vacío", () => {
    expect(subtotal([])).toBe(0);
    expect(totalUnits([])).toBe(0);
  });
});

describe("fusión de carritos", () => {
  it("suma sin pasar del stock", () => {
    expect(mergedQuantity(2, 3, 10)).toBe(5);
    expect(mergedQuantity(4, 4, 5)).toBe(5);
  });
  it("sin stock conserva la línea (no desaparece en silencio)", () => expect(mergedQuantity(2, 1, 0)).toBe(3));
  it("respeta el máximo por línea", () => expect(mergedQuantity(15, 15, 500)).toBe(MAX_QUANTITY_PER_LINE));
  it("nunca devuelve menos de 1", () => expect(mergedQuantity(1, 0, 1)).toBeGreaterThanOrEqual(1));
});

describe("identidad de línea y token", () => {
  it("producto con distinta variante = línea distinta; sin variante es otra clave", () => {
    expect(lineKey("p1", "vM")).not.toBe(lineKey("p1", "vL"));
    expect(lineKey("p1", null)).not.toBe(lineKey("p1", "vM"));
    expect(lineKey("p1", "vM")).toBe(lineKey("p1", "vM"));
  });
  it("el token de invitada tiene 43 caracteres base64url", () => {
    expect(CART_TOKEN_PATTERN.test("A".repeat(43))).toBe(true);
    expect(CART_TOKEN_PATTERN.test("A".repeat(42))).toBe(false);
    expect(CART_TOKEN_PATTERN.test("A".repeat(42) + "!")).toBe(false);
  });
});

describe("etiqueta de variante", () => {
  it("arma 'Talla: M · Color: Azul' desde las opciones", () => {
    expect(variantLabel({ name: "M / Azul", options: { Talla: "M", Color: "Azul" } })).toBe("Talla: M · Color: Azul");
    expect(variantLabel({ name: null, options: { Talla: "L" } })).toBe("Talla: L");
  });
  it("PostgreSQL reordena las claves del jsonb: igual sale 'Talla' antes que 'Color' (orden del nombre)", () => {
    expect(variantLabel({ name: "M / Azul", options: { Color: "Azul", Talla: "M" } })).toBe("Talla: M · Color: Azul");
    expect(variantLabel({ name: "Azul / M", options: { Color: "Azul", Talla: "M" } })).toBe("Color: Azul · Talla: M");
  });
  it("respeta un nombre propio distinto del automático", () => {
    expect(variantLabel({ name: "Edición Caribe", options: { Talla: "M" } })).toBe("Edición Caribe");
  });
  it("sin opciones usa el nombre, el SKU o un texto genérico", () => {
    expect(variantLabel({ name: "Grande", options: {} })).toBe("Grande");
    expect(variantLabel({ name: null, options: null, sku: "CAM-L" })).toBe("CAM-L");
    expect(variantLabel({ name: null, options: {} })).toBe("Opción");
  });
});
