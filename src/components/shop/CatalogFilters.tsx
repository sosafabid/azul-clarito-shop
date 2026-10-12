"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { FILTER_PARAMS, shopHref, type CatalogSelection, type FacetOption } from "@/domain/catalog-filters";
import { cn } from "@/lib/utils";

/**
 * Filtros del catálogo con listas desplegables (`select`). Categoría y colección se combinan: al cambiar una se conserva la
 * otra. Las opciones muestran su cantidad de productos (calculada en el servidor contra el otro filtro elegido) y la opción
 * elegida siempre se ve. Con JavaScript, elegir navega de inmediato; sin JavaScript el formulario (GET) se envía con el botón
 * "Aplicar". La URL resultante es la misma de siempre (`?categoria=…&coleccion=…`) y se puede compartir. "Limpiar" vuelve a ver todo.
 */
type Props = {
  basePath: string;
  selection: CatalogSelection;
  categories: FacetOption[];
  /** En la página de una colección la colección ya está fija: no se ofrece como filtro. */
  collections?: FacetOption[];
  total: number;
};

/** Filtros activos que la persona puede quitar aquí (en la página de una colección, la colección está fija). */
function activeFilters({ selection, collections }: Pick<Props, "selection" | "collections">): number {
  return Number(Boolean(selection.category)) + (collections ? Number(Boolean(selection.collection)) : 0);
}

function FilterSelect({
  label,
  name,
  allLabel,
  options,
  onChange,
  pending,
}: {
  label: string;
  name: string;
  allLabel: string;
  options: FacetOption[];
  onChange: (slug: string) => void;
  pending: boolean;
}) {
  const id = useId();
  if (options.length === 0) return null;
  const selected = options.find((option) => option.selected)?.slug ?? "";
  return (
    <div className="min-w-0 flex-1 sm:max-w-xs">
      <label htmlFor={id} className="font-display text-sm font-bold uppercase tracking-[0.14em] text-navy/60">
        {label}
      </label>
      <div className="relative mt-2">
        <select
          id={id}
          name={name}
          value={selected}
          disabled={pending}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "w-full appearance-none rounded-full border bg-paper py-2.5 pl-4 pr-10 text-sm font-semibold text-navy transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-aqua disabled:opacity-60",
            selected ? "border-navy" : "border-celeste hover:border-navy",
          )}
        >
          <option value="">{allLabel}</option>
          {options.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.name} ({option.count})
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-navy">
          ▾
        </span>
      </div>
    </div>
  );
}

export function CatalogFilters({ basePath, selection, categories, collections, total }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (categories.length === 0 && (collections?.length ?? 0) === 0) return null;
  const active = activeFilters({ selection, collections });

  // En la página de una colección ésta ya va en la ruta: no se repite en la consulta.
  const go = (next: Partial<CatalogSelection>) =>
    startTransition(() => router.push(shopHref({ ...selection, ...next, ...(collections ? {} : { collection: null }) }, basePath)));

  return (
    <form method="get" action={basePath} className="space-y-4" aria-label="Filtros de la tienda">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <FilterSelect label="Categorías" name={FILTER_PARAMS.category} allLabel="Todas las categorías" options={categories} pending={pending} onChange={(slug) => go({ category: slug || null })} />
        {collections && (
          <FilterSelect label="Colecciones" name={FILTER_PARAMS.collection} allLabel="Todas las colecciones" options={collections} pending={pending} onChange={(slug) => go({ collection: slug || null })} />
        )}
        {/* Sin JavaScript, los select no navegan solos: este botón envía el formulario. Con JavaScript queda oculto. */}
        <noscript>
          <button type="submit" className="rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-paper">
            Aplicar filtros
          </button>
        </noscript>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <p role="status" className="text-ink/70">
          {total === 1 ? "1 producto" : `${total} productos`}
        </p>
        {active > 0 && (
          <Link href={shopHref({ ...selection, category: null, ...(collections ? { collection: null } : {}) }, basePath)} className="font-semibold text-navy underline underline-offset-4">
            Limpiar filtros
          </Link>
        )}
      </div>
    </form>
  );
}
