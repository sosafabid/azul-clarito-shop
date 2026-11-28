import { describe, expect, it } from "vitest";
import { buildProductJsonLd, productMetaDescription, type SeoProduct } from "./product-seo";

const base: SeoProduct = {
  slug: "tutty-gorra", sku: "GOR-001", name: "Tutty Gorra", shortDescription: "Gorra baby blue con la tortuga de la marca.", description: null,
  price: 12000, currency: "CRC", availability: "in_stock", categoryName: "Gorras", images: [{ url: "https://cdn.example.com/a.webp" }], variants: [],
};

describe("SEO de producto", () => {
  it("arma un Product con precio, moneda, SKU, foto y disponibilidad reales, sin reseñas inventadas", () => {
    const ld = buildProductJsonLd(base, { baseUrl: "https://shop.example.com/" });
    expect(ld["@type"]).toBe("Product");
    expect(ld.sku).toBe("GOR-001");
    expect(ld.url).toBe("https://shop.example.com/shop/tutty-gorra");
    expect(ld.offers).toMatchObject({ "@type": "Offer", price: "12000", priceCurrency: "CRC", availability: "https://schema.org/InStock" });
    expect(JSON.stringify(ld)).not.toMatch(/aggregateRating|review|priceValidUntil/);
  });
  it("agotado → OutOfStock", () => {
    expect(buildProductJsonLd({ ...base, availability: "out_of_stock" }, { baseUrl: "https://x.com" }).offers.availability).toBe("https://schema.org/OutOfStock");
  });
  it("variantes con precios distintos → AggregateOffer con el rango real", () => {
    const ld = buildProductJsonLd({ ...base, variants: [{ price: null }, { price: 15000 }] }, { baseUrl: "https://x.com" });
    expect(ld.offers).toMatchObject({ "@type": "AggregateOffer", lowPrice: "12000", highPrice: "15000", offerCount: 2 });
  });
  it("USD usa dos decimales", () => {
    expect(buildProductJsonLd({ ...base, currency: "USD", price: 1250 }, { baseUrl: "https://x.com" }).offers).toMatchObject({ price: "12.50", priceCurrency: "USD" });
  });
  it("la descripción meta cae a la larga o a un texto neutro y no pasa de ~160 caracteres", () => {
    expect(productMetaDescription({ name: "X", shortDescription: null, description: "a ".repeat(200) }).length).toBeLessThanOrEqual(160);
    expect(productMetaDescription({ name: "Tutty", shortDescription: null, description: null })).toContain("Tutty");
  });
});
