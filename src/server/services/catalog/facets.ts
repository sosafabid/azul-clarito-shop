import "server-only";
import { sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import type { CatalogSelection, FacetOption } from "@/domain/catalog-filters";

/**
 * OPCIONES DE FILTRO con su cantidad de productos.
 *
 * Cuentan SOLO productos ACTIVOS y se calculan CONTRA el otro filtro elegido: con la colección "Verano" seleccionada, cada categoría
 * muestra cuántos productos de "Verano" tiene (y desaparecen las que quedarían vacías). Así los filtros nunca prometen resultados
 * que no existen. La opción ya elegida siempre se muestra (aunque quede en 0) para poder quitarla.
 */
export type CatalogFacets = { categories: FacetOption[]; collections: FacetOption[]; total: number };

type Row = { slug: string; name: string; n: string | number };

export async function getCatalogFacets(db: Database, selection: CatalogSelection): Promise<CatalogFacets> {
  const byCollection = selection.collection
    ? sql`and exists (select 1 from product_collections pc join collections cx on cx.id = pc.collection_id where pc.product_id = p.id and cx.slug = ${selection.collection} and cx.is_active)`
    : sql``;
  const byCategory = selection.category
    ? sql`and exists (select 1 from categories cx where cx.id = p.category_id and cx.slug = ${selection.category} and cx.is_active)`
    : sql``;

  const [categoryRows, collectionRows, totalRows] = await Promise.all([
    db.execute(sql`
      select c.slug, c.name, count(p.id) as n
        from categories c
        left join products p on p.category_id = c.id and p.status = 'ACTIVE' ${byCollection}
       where c.is_active
       group by c.id
       order by c.sort_order asc, c.name asc`),
    db.execute(sql`
      select co.slug, co.name, count(p.id) as n
        from collections co
        left join product_collections pc on pc.collection_id = co.id
        left join products p on p.id = pc.product_id and p.status = 'ACTIVE' ${byCategory}
       where co.is_active
       group by co.id
       order by co.sort_order asc, co.name asc`),
    db.execute(sql`select count(*) as n from products p where p.status = 'ACTIVE' ${byCategory} ${byCollection}`),
  ]);

  const toOptions = (rows: Row[], selected: string | null): FacetOption[] =>
    rows
      .map((row) => ({ slug: row.slug, name: row.name, count: Number(row.n), selected: row.slug === selected }))
      .filter((option) => option.count > 0 || option.selected);

  return {
    categories: toOptions(categoryRows.rows as Row[], selection.category),
    collections: toOptions(collectionRows.rows as Row[], selection.collection),
    total: Number((totalRows.rows[0] as { n?: string | number } | undefined)?.n ?? 0),
  };
}

/** Una colección ACTIVA por slug (para su página propia). */
export async function getPublicCollection(db: Database, slug: string): Promise<{ slug: string; name: string; description: string | null } | null> {
  const result = await db.execute(sql`select slug, name, description from collections where slug = ${slug} and is_active limit 1`);
  const row = result.rows[0] as { slug: string; name: string; description: string | null } | undefined;
  return row ?? null;
}
