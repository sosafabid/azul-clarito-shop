/**
 * Filtros del catálogo (puros). Viajan en la URL (`?categoria=…&coleccion=…`) para que se puedan compartir y funcionen sin JavaScript.
 * Solo se aceptan slugs bien formados: cualquier otra cosa se ignora (nunca llega a una consulta).
 */
import { SLUG_PATTERN } from "./slug";

export type CatalogSelection = { category: string | null; collection: string | null };

export const FILTER_PARAMS = { category: "categoria", collection: "coleccion" } as const;

const first = (value: string | string[] | undefined): string | null => (Array.isArray(value) ? (value[0] ?? null) : (value ?? null));

const cleanSlug = (value: string | null): string | null => (value && value.length <= 80 && SLUG_PATTERN.test(value) ? value : null);

export function parseCatalogSelection(params: Record<string, string | string[] | undefined>): CatalogSelection {
  return { category: cleanSlug(first(params[FILTER_PARAMS.category])), collection: cleanSlug(first(params[FILTER_PARAMS.collection])) };
}

/** URL de la tienda con la selección dada (sin filtros = `/shop`). */
export function shopHref(selection: Partial<CatalogSelection>, base = "/shop"): string {
  const query = new URLSearchParams();
  if (selection.category) query.set(FILTER_PARAMS.category, selection.category);
  if (selection.collection) query.set(FILTER_PARAMS.collection, selection.collection);
  const text = query.toString();
  return text ? `${base}?${text}` : base;
}

export type FacetOption = { slug: string; name: string; count: number; selected: boolean };
