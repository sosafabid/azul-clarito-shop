import "server-only";
import {
  type Product,
  type ProductImage,
  type ProductVariant,
  productImages,
  productVariants,
  products,
} from "@/db/schema";
import type { PublicProduct, PublicProductImage, PublicProductVariant } from "@/types/catalog";

/**
 * FRONTERA PÚBLICA DEL CATÁLOGO.
 *
 * `products.cost` (y `product_variants.cost`) es información interna y no
 * debe salir nunca del servidor hacia el navegador. Dos defensas:
 *
 *  1. Consultas: las consultas públicas seleccionan SOLO estas columnas, así
 *     que el costo ni siquiera sale de la base de datos.
 *       db.select(publicProductColumns).from(products).where(...)
 *
 *  2. Mapeadores: `toPublicProduct` & co. copian campo por campo (lista
 *     blanca). No usan `...spread` ni "omitir cost": si mañana se agrega una
 *     columna interna nueva, NO se filtra por defecto.
 *
 * Cualquier dato que viaje a un componente cliente o a la respuesta de una API
 * pública debe pasar por aquí.
 */
export const publicProductColumns = {
  id: products.id,
  slug: products.slug,
  sku: products.sku,
  name: products.name,
  shortDescription: products.shortDescription,
  description: products.description,
  price: products.price,
  currency: products.currency,
  categoryId: products.categoryId,
  collectionId: products.collectionId,
  isFeatured: products.isFeatured,
  isNew: products.isNew,
  isLimitedEdition: products.isLimitedEdition,
} as const;

export const publicVariantColumns = {
  id: productVariants.id,
  sku: productVariants.sku,
  name: productVariants.name,
  options: productVariants.options,
  price: productVariants.price,
} as const;

export const publicImageColumns = {
  id: productImages.id,
  url: productImages.url,
  alt: productImages.alt,
  width: productImages.width,
  height: productImages.height,
  isPrimary: productImages.isPrimary,
} as const;

type PublicProductSource = Pick<Product, keyof PublicProduct>;
type PublicVariantSource = Pick<ProductVariant, keyof PublicProductVariant>;
type PublicImageSource = Pick<ProductImage, keyof PublicProductImage>;

export function toPublicProduct(row: PublicProductSource): PublicProduct {
  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    name: row.name,
    shortDescription: row.shortDescription,
    description: row.description,
    price: row.price,
    currency: row.currency,
    categoryId: row.categoryId,
    collectionId: row.collectionId,
    isFeatured: row.isFeatured,
    isNew: row.isNew,
    isLimitedEdition: row.isLimitedEdition,
  };
}

export function toPublicVariant(row: PublicVariantSource): PublicProductVariant {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    options: row.options,
    price: row.price,
  };
}

export function toPublicImage(row: PublicImageSource): PublicProductImage {
  return {
    id: row.id,
    url: row.url,
    alt: row.alt,
    width: row.width,
    height: row.height,
    isPrimary: row.isPrimary,
  };
}
