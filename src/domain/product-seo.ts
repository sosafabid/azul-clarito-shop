/**
 * SEO de producto (puro). Solo datos REALES del catálogo: nombre, descripción, SKU, fotos, precio y disponibilidad vigentes.
 * No se inventan reseñas, calificaciones, marcas ajenas, envíos ni vigencias de precio. Es la misma información que luego puede
 * alimentar Google Merchant Center (fichas gratuitas).
 */
import { fromMinorUnits, toCurrency } from "@/domain/money";
import type { ProductAvailability } from "@/types/catalog";

export const BRAND_NAME = "Azul Clarito";

export type SeoProduct = {
  slug: string;
  sku: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  price: number;
  currency: string;
  availability: ProductAvailability;
  categoryName: string | null;
  images: { url: string; alt?: string | null }[];
  variants: { price: number | null }[];
};

export function productMetaDescription(product: Pick<SeoProduct, "name" | "shortDescription" | "description">): string {
  const source = (product.shortDescription || product.description || "").replace(/\s+/g, " ").trim();
  if (!source) return `${product.name}: pieza de ${BRAND_NAME} Shop, creada desde Limón, Costa Rica.`;
  return source.length <= 158 ? source : `${source.slice(0, 155).trimEnd()}…`;
}

const abs = (baseUrl: string, path: string) => `${baseUrl.replace(/\/+$/, "")}${path}`;
const priceText = (amount: number, currency: string) => {
  const code = toCurrency(currency);
  return fromMinorUnits(amount, code).toFixed(code === "USD" ? 2 : 0);
};

export function buildProductJsonLd(product: SeoProduct, opts: { baseUrl: string }) {
  const url = abs(opts.baseUrl, `/shop/${encodeURIComponent(product.slug)}`);
  const currency = toCurrency(product.currency);
  const prices = [product.price, ...product.variants.map((variant) => variant.price ?? product.price)];
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const availability = product.availability === "out_of_stock" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock";
  const offer =
    low === high
      ? { "@type": "Offer", url, priceCurrency: currency, price: priceText(product.price, currency), availability }
      : { "@type": "AggregateOffer", url, priceCurrency: currency, lowPrice: priceText(low, currency), highPrice: priceText(high, currency), offerCount: prices.length - 1, availability };
  const description = productMetaDescription(product);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description,
    sku: product.sku,
    url,
    ...(product.images.length > 0 ? { image: product.images.slice(0, 6).map((image) => image.url) } : {}),
    brand: { "@type": "Brand", name: BRAND_NAME },
    ...(product.categoryName ? { category: product.categoryName } : {}),
    offers: offer,
  };
}
