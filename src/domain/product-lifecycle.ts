import type { ProductStatus } from "./catalog";

/**
 * Ciclo de vida de un producto.
 *
 *   Activo (ACTIVE)    → publicado: aparece en /shop.
 *   Oculto (DRAFT)     → existe en el panel pero NO aparece en /shop; puede publicarse.
 *   Archivado          → fuera del catálogo activo; aparece en el filtro "Archivados"; puede restaurarse.
 *   Eliminado          → borrado definitivo (solo sin historial de ventas; ver `deleteBlockers`).
 *
 * "Oculto" usa el valor DRAFT del enum de la base de datos (no hizo falta agregar un estado nuevo).
 */
export const STATUS_LABELS: Record<ProductStatus, string> = {
  ACTIVE: "Activo",
  DRAFT: "Oculto",
  ARCHIVED: "Archivado",
};

export const PRODUCT_ACTIONS = ["publish", "hide", "archive", "restore"] as const;
export type ProductAction = (typeof PRODUCT_ACTIONS)[number];

export const PRODUCT_ACTION_RULES: Record<
  ProductAction,
  { from: readonly ProductStatus[]; to: ProductStatus; label: string; audit: string }
> = {
  publish: { from: ["DRAFT"], to: "ACTIVE", label: "Publicar", audit: "product.published" },
  hide: { from: ["ACTIVE"], to: "DRAFT", label: "Ocultar", audit: "product.hidden" },
  archive: { from: ["ACTIVE", "DRAFT"], to: "ARCHIVED", label: "Archivar", audit: "product.archived" },
  // Restaurar deja el producto OCULTO (seguro): publicarlo es una decisión aparte.
  restore: { from: ["ARCHIVED"], to: "DRAFT", label: "Restaurar", audit: "product.restored" },
};

export function isProductAction(value: string): value is ProductAction {
  return (PRODUCT_ACTIONS as readonly string[]).includes(value);
}

export function canApplyAction(action: ProductAction, status: ProductStatus): boolean {
  return PRODUCT_ACTION_RULES[action].from.includes(status);
}

/** Acciones disponibles para un producto según su estado actual. */
export function availableActions(status: ProductStatus): ProductAction[] {
  return PRODUCT_ACTIONS.filter((action) => canApplyAction(action, status));
}

// ── Filtros del listado ────────────────────────────────────────────────
export const PRODUCT_FILTERS = ["todos", "activos", "ocultos", "archivados"] as const;
export type ProductFilter = (typeof PRODUCT_FILTERS)[number];

export const PRODUCT_FILTER_LABELS: Record<ProductFilter, string> = {
  todos: "Todos",
  activos: "Activos",
  ocultos: "Ocultos",
  archivados: "Archivados",
};

const FILTER_STATUSES: Record<ProductFilter, readonly ProductStatus[]> = {
  todos: ["ACTIVE", "DRAFT", "ARCHIVED"],
  activos: ["ACTIVE"],
  ocultos: ["DRAFT"],
  archivados: ["ARCHIVED"],
};

export function parseProductFilter(value: string | undefined): ProductFilter {
  return (PRODUCT_FILTERS as readonly string[]).includes(value ?? "") ? (value as ProductFilter) : "todos";
}

export function statusesForFilter(filter: ProductFilter): readonly ProductStatus[] {
  return FILTER_STATUSES[filter];
}

// ── Búsqueda ────────────────────────────────────────────────────────────
export const MAX_SEARCH_LENGTH = 100;

export function parseSearch(value: string | undefined): string {
  return (value ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
}

/** Escapa `%`, `_` y `\` para usar el texto buscado dentro de un ILIKE sin comodines accidentales. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// ── Eliminación definitiva ──────────────────────────────────────────────
export type DeleteBlocker = "has_orders" | "has_sales";

export const DELETE_BLOCKER_MESSAGES: Record<DeleteBlocker, string> = {
  has_orders: "Este producto tiene pedidos en su historial: no se puede eliminar, pero sí archivar.",
  has_sales: "Este producto registra unidades vendidas: no se puede eliminar, pero sí archivar.",
};

/** La confirmación exige escribir el SKU del producto (sin importar mayúsculas ni espacios). */
export function deleteConfirmationMatches(typed: string, sku: string): boolean {
  return typed.trim().toLowerCase() === sku.trim().toLowerCase() && sku.trim() !== "";
}
