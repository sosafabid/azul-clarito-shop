import { describe, expect, it } from "vitest";
import { catalogCapabilities } from "./capabilities";
import { constrainProductInput, priceBelowStoredCost } from "./catalog-limits";
import { redactCosts, stripCosts } from "./redaction";
import type { ParsedProduct } from "./product-form";

const input = (over: Partial<ParsedProduct> = {}): ParsedProduct => ({
  name: "Camiseta", slug: "camiseta", sku: "CAM-1", shortDescription: null, description: null, status: "ACTIVE", categoryId: null, newCategory: null,
  collectionId: null, newCollection: null, imageUrls: [], isFeatured: false, isNew: false, isLimitedEdition: false, currency: "CRC",
  price: 10000, cost: 1, availableStock: 99, lowStockThreshold: 0, ...over,
});

describe("capacidades del catálogo", () => {
  it("SUPER_ADMIN tiene todas; STAFF ninguna de las sensibles", () => {
    expect(catalogCapabilities("SUPER_ADMIN")).toEqual({ costs: true, stock: true, publish: true, delete: true });
    expect(catalogCapabilities("STAFF")).toEqual({ costs: false, stock: false, publish: false, delete: false });
    expect(catalogCapabilities("CUSTOMER")).toEqual({ costs: false, stock: false, publish: false, delete: false });
  });
});

describe("límites de STAFF al guardar productos (aunque fabrique la petición)", () => {
  it("al crear: sin costo, sin stock y Oculto", () => {
    const out = constrainProductInput(input(), catalogCapabilities("STAFF"));
    expect(out).toMatchObject({ cost: null, availableStock: 0, status: "DRAFT" });
  });
  it("al editar: conserva el costo y el stock guardados", () => {
    const out = constrainProductInput(input(), catalogCapabilities("STAFF"), { cost: 4000, availableStock: 7 });
    expect(out).toMatchObject({ cost: 4000, availableStock: 7 });
  });
  it("SUPER_ADMIN guarda lo que envía", () => {
    expect(constrainProductInput(input(), catalogCapabilities("SUPER_ADMIN"))).toMatchObject({ cost: 1, availableStock: 99, status: "ACTIVE" });
  });
  it("detecta un precio por debajo del costo guardado", () => {
    expect(priceBelowStoredCost(3000, 4000)).toBe(true);
    expect(priceBelowStoredCost(5000, 4000)).toBe(false);
    expect(priceBelowStoredCost(5000, null)).toBe(false);
  });
});

describe("redacción de costos", () => {
  const rows = [{ sku: "A", cost: 100, stock: { valueAtCost: 500, available: 3 }, rowsWithoutCost: 2 }];
  it("quita costos (también anidados) para quien no tiene costs:read", () => {
    const [row] = redactCosts(rows, false);
    expect(row).toEqual({ sku: "A", cost: null, stock: { valueAtCost: null, available: 3 }, rowsWithoutCost: 0 });
    expect(JSON.stringify(stripCosts(rows[0]))).not.toMatch(/100|500/);
  });
  it("deja todo igual para SUPER_ADMIN", () => {
    expect(redactCosts(rows, true)).toEqual(rows);
  });
});
