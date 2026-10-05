/**
 * Tipos "públicos" del catálogo: lo ÚNICO que se puede enviar al navegador.
 *
 * Nota: aquí NO existe `cost`. Si un campo no está en estos tipos, no sale del
 * servidor. Ver `src/server/services/catalog/public.ts`.
 */
export type PublicProductVariant = {
  id: string;
  sku: string;
  name: string | null;
  options: Record<string, string>;
  /** Precio propio de la variante; `null` = usa el precio del producto. */
  price: number | null;
};

export type PublicProductImage = {
  id: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  isPrimary: boolean;
};

export type PublicProduct = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  /** Entero en unidad mínima de la moneda (ver `src/domain/money.ts`). */
  price: number;
  currency: string;
  categoryId: string | null;
  collectionId: string | null;
  isFeatured: boolean;
  isNew: boolean;
  isLimitedEdition: boolean;
};

/**
 * Disponibilidad PÚBLICA: solo un estado. Las cantidades (disponible, reservado,
 * vendido) son internas: "vendido" revelaría las ventas.
 */
export type ProductAvailability = "in_stock" | "low_stock" | "out_of_stock";

export type PublicProductListItem = PublicProduct & {
  categoryName: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  availability: ProductAvailability;
};

/** Variante visible al público: opciones, precio y un ESTADO de disponibilidad (nunca cantidades ni costo). */
export type PublicVariantItem = {
  id: string;
  name: string | null;
  options: Record<string, string>;
  /** Precio propio de la variante; `null` = el del producto. */
  price: number | null;
  availability: ProductAvailability;
};

export type PublicProductDetail = PublicProductListItem & {
  images: PublicProductImage[];
  variants: PublicVariantItem[];
};
