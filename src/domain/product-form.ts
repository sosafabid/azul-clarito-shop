import { isSupportedCurrency, parseMoneyInput, type CurrencyCode, DEFAULT_CURRENCY } from "./money";
import type { ProductStatus } from "./catalog";
import { SLUG_PATTERN, slugify } from "./slug";
import { isUuid } from "./ids";
import { MAX_IMAGES_PER_PRODUCT, parseImageUrls } from "./images";
import { SKU_PATTERN } from "./product-form-shared";
import { unitEconomics } from "./product-economics";

/** Lo que llega del formulario (todo texto). */
export type ProductFormInput = Partial<Record<string, string>>;

export type ParsedProduct = {
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  /** Solo se usa al CREAR. Al editar es `null`: el estado cambia con las acciones publicar/ocultar/archivar/restaurar. */
  status: ProductStatus | null;
  /** Categoría existente (id) o `null`. */
  categoryId: string | null;
  /** Nombre de una categoría NUEVA a crear (tiene prioridad sobre `categoryId`). */
  newCategory: string | null;
  collectionId: string | null;
  newCollection: string | null;
  /** URLs de imágenes https para asociar al crear. */
  imageUrls: string[];
  isFeatured: boolean;
  isNew: boolean;
  isLimitedEdition: boolean;
  currency: CurrencyCode;
  price: number;
  cost: number | null;
  availableStock: number;
  lowStockThreshold: number;
};

export type ProductFormResult =
  | { ok: true; data: ParsedProduct }
  | { ok: false; errors: Record<string, string> };

export const MAX_STOCK = 1_000_000;

function text(input: ProductFormInput, key: string): string {
  return (input[key] ?? "").trim();
}

function checked(input: ProductFormInput, key: string): boolean {
  return input[key] === "on" || input[key] === "true";
}

function parseCount(value: string, label: string, errors: Record<string, string>, key: string): number {
  if (!/^\d+$/.test(value)) {
    errors[key] = `${label}: usá un número entero (0 o más).`;
    return 0;
  }
  const n = Number(value);
  if (n > MAX_STOCK) {
    errors[key] = `${label}: el máximo es ${MAX_STOCK.toLocaleString("es-CR")}.`;
    return 0;
  }
  return n;
}

/**
 * Valida y normaliza el formulario de producto (crear/editar).
 *
 * Regla de margen: si el producto se vende por debajo de su costo, se rechaza
 * a menos que la persona haya confirmado explícitamente (`confirmLoss`).
 */
export function parseProductForm(input: ProductFormInput, mode: "create" | "update" = "create"): ProductFormResult {
  const errors: Record<string, string> = {};

  const name = text(input, "name");
  if (name.length < 2 || name.length > 120) errors.name = "El nombre debe tener entre 2 y 120 caracteres.";

  const slugInput = text(input, "slug");
  const slug = slugInput || slugify(name);
  // Si el slug se genera solo desde un nombre inválido, el error útil es el del nombre.
  if ((slugInput !== "" || !errors.name) && (!SLUG_PATTERN.test(slug) || slug.length > 80)) {
    errors.slug = "El slug solo puede tener minúsculas, números y guiones (ej: camiseta-azul).";
  }

  const sku = text(input, "sku");
  if (sku.length < 2 || sku.length > 60 || !SKU_PATTERN.test(sku)) {
    errors.sku = "El SKU debe tener 2 a 60 caracteres: letras, números, punto, guion o guion bajo.";
  }

  let status: ProductStatus | null = null;
  if (mode === "create") {
    // Un producto nuevo nace Oculto o Activo (no tiene sentido crearlo archivado).
    const statusRaw = text(input, "status") || "DRAFT";
    if (statusRaw === "DRAFT" || statusRaw === "ACTIVE") status = statusRaw;
    else errors.status = "Estado inicial inválido: elegí Oculto o Activo.";
  }

  const categoryIdRaw = text(input, "categoryId");
  if (categoryIdRaw !== "" && !isUuid(categoryIdRaw)) errors.categoryId = "Categoría inválida.";
  const newCategory = text(input, "newCategory");
  if (newCategory.length > 60) errors.newCategory = "El nombre de la categoría admite hasta 60 caracteres.";
  const collectionIdRaw = text(input, "collectionId");
  if (collectionIdRaw !== "" && !isUuid(collectionIdRaw)) errors.collectionId = "Colección inválida.";
  const newCollection = text(input, "newCollection");
  if (newCollection.length > 60) errors.newCollection = "El nombre de la colección admite hasta 60 caracteres.";

  const images = mode === "create" ? parseImageUrls(input.imageUrls ?? "") : { urls: [], errors: [] };
  if (images.errors.length > 0) errors.imageUrls = images.errors[0];
  else if (images.urls.length > MAX_IMAGES_PER_PRODUCT) errors.imageUrls = `Máximo ${MAX_IMAGES_PER_PRODUCT} imágenes.`;

  const currencyRaw = text(input, "currency") || DEFAULT_CURRENCY;
  const currency = isSupportedCurrency(currencyRaw) ? currencyRaw : null;
  if (!currency) errors.currency = "Moneda no soportada.";

  let price = 0;
  let cost: number | null = null;
  if (currency) {
    const parsedPrice = parseMoneyInput(text(input, "price"), currency);
    if (parsedPrice.ok) price = parsedPrice.amount;
    else errors.price = `Precio: ${parsedPrice.error}`;

    const costRaw = text(input, "cost");
    if (costRaw !== "") {
      const parsedCost = parseMoneyInput(costRaw, currency);
      if (parsedCost.ok) cost = parsedCost.amount;
      else errors.cost = `Costo: ${parsedCost.error}`;
    }
  }

  const availableStock = parseCount(text(input, "availableStock") || "0", "Stock disponible", errors, "availableStock");
  const lowStockThreshold = parseCount(
    text(input, "lowStockThreshold") || "0",
    "Alerta de stock bajo",
    errors,
    "lowStockThreshold",
  );

  if (!errors.price && !errors.cost && cost !== null && unitEconomics(price, cost).isLoss && !checked(input, "confirmLoss")) {
    errors.confirmLoss =
      "El precio es menor que el costo: se vendería con pérdida. Marcá la casilla para confirmar que es intencional.";
  }

  const shortDescription = text(input, "shortDescription");
  const description = text(input, "description");
  if (shortDescription.length > 300) errors.shortDescription = "La descripción corta admite hasta 300 caracteres.";
  if (description.length > 5000) errors.description = "La descripción admite hasta 5.000 caracteres.";

  if (Object.keys(errors).length > 0 || !currency || (mode === "create" && !status)) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      slug,
      sku,
      shortDescription: shortDescription || null,
      description: description || null,
      status,
      categoryId: categoryIdRaw || null,
      newCategory: newCategory || null,
      collectionId: collectionIdRaw || null,
      newCollection: newCollection || null,
      imageUrls: images.urls,
      isFeatured: checked(input, "isFeatured"),
      isNew: checked(input, "isNew"),
      isLimitedEdition: checked(input, "isLimitedEdition"),
      currency,
      price,
      cost,
      availableStock,
      lowStockThreshold,
    },
  };
}
