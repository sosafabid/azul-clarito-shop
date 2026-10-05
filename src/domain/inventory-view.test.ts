import { describe, expect, it } from "vitest";
import { filterAndSortInventory, stockState, summarizeInventory, toInventoryItem } from "./inventory-view";

const item = (over: Partial<Parameters<typeof toInventoryItem>[0]>) =>
  toInventoryItem({
    inventoryId: "i",
    productId: "p",
    name: "Producto",
    variantName: null,
    sku: "SKU",
    status: "ACTIVE",
    currency: "CRC",
    availableStock: 10,
    reservedStock: 0,
    soldStock: 0,
    lowStockThreshold: 3,
    productPrice: 10000,
    productCost: 4000,
    variantPrice: null,
    variantCost: null,
    ...over,
  });

describe("estado de stock", () => {
  it("sin stock, bajo y ok", () => {
    expect(stockState(0, 3)).toBe("out");
    expect(stockState(2, 3)).toBe("low");
    expect(stockState(3, 3)).toBe("low");
    expect(stockState(4, 3)).toBe("ok");
  });
  it("con umbral 0 solo existe 'sin stock' u 'ok'", () => {
    expect(stockState(1, 0)).toBe("ok");
    expect(stockState(0, 0)).toBe("out");
  });
});

describe("inventario", () => {
  it("la variante pisa el precio y costo del producto", () => {
    const i = item({ variantPrice: 15000, variantCost: 6000 });
    expect([i.price, i.cost]).toEqual([15000, 6000]);
  });

  it("filtros y orden", () => {
    const rows = [
      item({ inventoryId: "a", name: "A", availableStock: 10, productCost: 1000 }), // valor 10.000, util 90.000
      item({ inventoryId: "b", name: "B", availableStock: 2, productCost: 8000 }), //  low, valor 16.000, util 4.000
      item({ inventoryId: "c", name: "C", availableStock: 0 }), // out
      item({ inventoryId: "d", name: "D", availableStock: 5, productCost: null }), // sin costo
    ];
    expect(filterAndSortInventory(rows, "low").map((r) => r.name)).toEqual(["B"]);
    expect(filterAndSortInventory(rows, "out").map((r) => r.name)).toEqual(["C"]);
    expect(filterAndSortInventory(rows, "value").map((r) => r.name)).toEqual(["B", "A", "C", "D"]);
    expect(filterAndSortInventory(rows, "profit").map((r) => r.name)).toEqual(["A", "B", "C", "D"]);
    expect(filterAndSortInventory(rows, "all")).toHaveLength(4);
  });

  it("el resumen no suma filas sin costo ni de otra moneda", () => {
    const rows = [
      item({ availableStock: 10, productCost: 1000 }),
      item({ availableStock: 5, productCost: null }),
      item({ availableStock: 1, currency: "USD" }),
    ];
    const s = summarizeInventory(rows, "CRC");
    expect(s.valueAtCost).toBe(10000);
    expect(s.potentialProfit).toBe(90000);
    expect(s.potentialSalesValue).toBe(150000); // incluye la fila sin costo (tiene precio)
    expect(s.itemsWithoutCost).toBe(1);
    expect(s.itemsInOtherCurrency).toBe(1);
  });
});
