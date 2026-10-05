import { describe, expect, it } from "vitest";
import { diffProductEconomics } from "./product-audit";
import { parseProductForm } from "./product-form";

const valid = {
  name: "Camiseta Azul",
  sku: "CAM-AZU-01",
  price: "12000",
  cost: "5000",
  currency: "CRC",
  availableStock: "10",
  lowStockThreshold: "3",
  status: "ACTIVE",
};

describe("parseProductForm", () => {
  it("acepta un producto válido y genera el slug desde el nombre", () => {
    const result = parseProductForm(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        slug: "camiseta-azul",
        price: 12000,
        cost: 5000,
        availableStock: 10,
        lowStockThreshold: 3,
        status: "ACTIVE",
        isFeatured: false,
      });
    }
  });

  it("el costo es opcional (queda null, no 0)", () => {
    const result = parseProductForm({ ...valid, cost: "" });
    expect(result.ok && result.data.cost).toBeNull();
  });

  it("rechaza vender con pérdida salvo confirmación explícita", () => {
    const loss = { ...valid, price: "4000", cost: "5000" };
    const rejected = parseProductForm(loss);
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.errors.confirmLoss).toMatch(/pérdida/);

    const confirmed = parseProductForm({ ...loss, confirmLoss: "on" });
    expect(confirmed.ok).toBe(true);
  });

  it("precio igual al costo no exige confirmación", () => {
    expect(parseProductForm({ ...valid, price: "5000", cost: "5000" }).ok).toBe(true);
  });

  it("devuelve errores por campo", () => {
    const result = parseProductForm({ name: "", sku: "", price: "abc", availableStock: "-1" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(["availableStock", "name", "price", "sku"]);
    }
  });

  it("rechaza stock decimal o negativo y estado inválido", () => {
    expect(parseProductForm({ ...valid, availableStock: "1.5" }).ok).toBe(false);
    expect(parseProductForm({ ...valid, status: "HACKED" }).ok).toBe(false);
  });
});

describe("diffProductEconomics (qué se audita)", () => {
  const before = { price: 12000, cost: 5000, currency: "CRC", availableStock: 10, status: "ACTIVE" };

  it("sin cambios no registra nada", () => {
    expect(diffProductEconomics(before, { ...before })).toEqual([]);
  });

  it("registra precio, costo y stock con valor anterior y nuevo", () => {
    const changes = diffProductEconomics(before, { ...before, price: 15000, cost: 6000, availableStock: 7 });
    expect(changes.map((c) => [c.field, c.from, c.to, c.action])).toEqual([
      ["price", 12000, 15000, "product.price_changed"],
      ["cost", 5000, 6000, "product.cost_changed"],
      ["availableStock", 10, 7, "product.stock_changed"],
    ]);
  });


  it("distingue costo desconocido (null) de costo 0", () => {
    expect(diffProductEconomics(before, { ...before, cost: null })).toHaveLength(1);
    expect(diffProductEconomics({ ...before, cost: null }, { ...before, cost: 0 })).toHaveLength(1);
  });
});
