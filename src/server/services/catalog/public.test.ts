import { describe, expect, it } from "vitest";
import type { Product, ProductVariant } from "@/db/schema";
import { toPublicProduct, toPublicVariant } from "./public";

const productRow: Product = {
  id: "11111111-1111-1111-1111-111111111111",
  slug: "demo",
  sku: "SKU-DEMO",
  name: "Demo",
  description: "Descripción",
  shortDescription: "Corta",
  price: 12000,
  cost: 5000, // INTERNO
  currency: "CRC",
  categoryId: null,
  collectionId: null,
  status: "ACTIVE",
  isFeatured: true,
  isNew: false,
  isLimitedEdition: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const variantRow: ProductVariant = {
  id: "22222222-2222-2222-2222-222222222222",
  productId: productRow.id,
  sku: "SKU-DEMO-M",
  name: "M / Azul",
  options: { talla: "M", color: "Azul" },
  price: null,
  cost: 4000, // INTERNO
  isActive: true,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("frontera pública del catálogo", () => {
  it("el producto público NO incluye el costo", () => {
    const publicProduct = toPublicProduct(productRow);
    expect(publicProduct).not.toHaveProperty("cost");
    expect(JSON.stringify(publicProduct)).not.toContain("5000");
  });

  it("no filtra campos internos (status, timestamps)", () => {
    const keys = Object.keys(toPublicProduct(productRow)).sort();
    expect(keys).toEqual(
      [
        "categoryId",
        "collectionId",
        "currency",
        "description",
        "id",
        "isFeatured",
        "isLimitedEdition",
        "isNew",
        "name",
        "price",
        "shortDescription",
        "sku",
        "slug",
      ].sort(),
    );
  });

  it("aunque la fila trajera campos extra, solo salen los de la lista blanca", () => {
    const withExtra = { ...productRow, internalNote: "secreto" };
    expect(JSON.stringify(toPublicProduct(withExtra))).not.toContain("secreto");
  });

  it("la variante pública NO incluye el costo", () => {
    const publicVariant = toPublicVariant(variantRow);
    expect(publicVariant).not.toHaveProperty("cost");
    expect(JSON.stringify(publicVariant)).not.toContain("4000");
  });
});
