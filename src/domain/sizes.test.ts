import { describe, expect, it } from "vitest";
import { compareSizes, isSizeKey, normalizeSize, parseExtraSizes, parseSizesForm, sizeRank, sizeSku, sizeValueOf } from "./sizes";

describe("tallas: reconocimiento y orden", () => {
  it("reconoce la clave Talla (con o sin tilde/mayúsculas) y Size", () => {
    expect(["Talla", "talla", "TALLA", "Tamaño", "Size"].every(isSizeKey)).toBe(true);
    expect(isSizeKey("Color")).toBe(false);
  });
  it("sizeValueOf solo devuelve la talla cuando es la única opción", () => {
    expect(sizeValueOf({ Talla: "m" })).toBe("M");
    expect(sizeValueOf({ Talla: "M", Color: "Azul" })).toBeNull();
    expect(sizeValueOf({ Color: "Azul" })).toBeNull();
    expect(sizeValueOf({})).toBeNull();
    expect(sizeValueOf(null)).toBeNull();
  });
  it("ordena XS → XXL, luego números y al final Única", () => {
    const sizes = ["XL", "Única", "M", "40", "XS", "L", "XXL", "S", "38", "Rara"];
    expect([...sizes].sort(compareSizes)).toEqual(["XS", "S", "M", "L", "XL", "XXL", "38", "40", "Única", "Rara"]);
    expect(sizeRank("xs")).toBeLessThan(sizeRank("s"));
  });
  it("normaliza letras y respeta el resto", () => {
    expect(normalizeSize(" xl ")).toBe("XL");
    expect(normalizeSize("Única")).toBe("Única");
    expect(normalizeSize("38")).toBe("38");
  });
  it("arma el SKU de cada talla", () => {
    expect(sizeSku("CAM-TORT", "XL")).toBe("CAM-TORT-XL");
    expect(sizeSku("CAM-TORT", "Única")).toBe("CAM-TORT-UNICA");
    expect(sizeSku("CAM-TORT", "3XL")).toBe("CAM-TORT-3XL");
  });
});

describe("tallas: formulario para crear varias a la vez", () => {
  it("parsea otras tallas con stock", () => {
    expect(parseExtraSizes("38:5, 40:3, Única:10, 42").entries).toEqual([
      { size: "38", stock: 5 }, { size: "40", stock: 3 }, { size: "Única", stock: 10 }, { size: "42", stock: 0 },
    ]);
    expect(parseExtraSizes("38:abc").error).toMatch(/stock/);
  });
  it("crea las tallas marcadas, ordenadas y con su stock", () => {
    const r = parseSizesForm({ baseSku: "CAM-TORT", size_M: "on", stock_M: "4", size_S: "on", stock_S: "2", size_XL: "on", stock_XL: "", isActive: "on" }, "CRC");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.sizes).toEqual([{ size: "S", stock: 2 }, { size: "M", stock: 4 }, { size: "XL", stock: 0 }]);
      expect(r.data.price).toBeNull();
      expect(r.data.isActive).toBe(true);
    }
  });
  it("une tallas repetidas y suma las extra", () => {
    const r = parseSizesForm({ baseSku: "ZAP", size_M: "on", stock_M: "1", extraSizes: "m:9, 38:2" }, "CRC");
    expect(r.ok && r.data.sizes).toEqual([{ size: "M", stock: 9 }, { size: "38", stock: 2 }]);
  });
  it("exige SKU base y al menos una talla, y valida stock y precio", () => {
    const none = parseSizesForm({ baseSku: "A" }, "CRC");
    expect(none.ok).toBe(false);
    if (!none.ok) expect(Object.keys(none.errors)).toEqual(expect.arrayContaining(["baseSku"]));
    expect(parseSizesForm({ baseSku: "CAM", size_M: "on" , stock_M: "-1" }, "CRC").ok).toBe(false);
    const noSize = parseSizesForm({ baseSku: "CAM-OK" }, "CRC");
    expect(!noSize.ok && noSize.errors.sizes).toMatch(/al menos una talla/);
    expect(parseSizesForm({ baseSku: "CAM-OK", size_M: "on", price: "abc" }, "CRC").ok).toBe(false);
  });
});
