import type { Metadata } from "next";
import Link from "next/link";
import { CatalogFilters } from "@/components/shop/CatalogFilters";
import { ProductCard } from "@/components/shop/ProductCard";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Container } from "@/components/ui/Container";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { parseCatalogSelection } from "@/domain/catalog-filters";
import { getCatalogFacets } from "@/server/services/catalog/facets";
import { listPublicProducts } from "@/server/services/catalog/queries";

export const metadata: Metadata = { title: "Tienda" };

// Los datos salen de la base de datos en cada visita (aún sin caché).
export const dynamic = "force-dynamic";

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const selection = parseCatalogSelection(await searchParams);
  const db = isDatabaseConfigured() ? getDb() : null;
  const [catalog, facets] = db ? await Promise.all([listPublicProducts(db, { categorySlug: selection.category, collectionSlug: selection.collection }), getCatalogFacets(db, selection)]) : [[], null];
  const filtering = Boolean(selection.category || selection.collection);

  if (catalog.length === 0 && !filtering) {
    return (
      <ComingSoon
        title="La tienda abre muy pronto"
        description="Todavía no hay productos publicados. Estamos preparando el catálogo de Azul Clarito: objetos, música, libros y piezas especiales."
      />
    );
  }

  return (
    <section className="bg-paper py-14 sm:py-20">
      <Container>
        <h1 className="text-4xl font-bold sm:text-5xl">Tienda</h1>
        <p className="mt-3 max-w-xl text-lg text-ink/75">Objetos, música, libros y piezas especiales de Azul Clarito.</p>

        {facets && (
          <div className="mt-8">
            <CatalogFilters basePath={routes.shop} selection={selection} categories={facets.categories} collections={facets.collections} total={catalog.length} />
            {selection.collection && (
              <p className="mt-3 text-sm">
                <Link href={routes.shopCollection(selection.collection)} className="font-semibold text-navy underline underline-offset-4">
                  Abrir la página de esta colección
                </Link>
              </p>
            )}
          </div>
        )}

        {catalog.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-celeste p-6 text-ink/75">
            No hay productos con esa combinación.{" "}
            <Link href={routes.shop} className="font-semibold text-navy underline underline-offset-4">
              Ver toda la tienda
            </Link>
          </p>
        ) : (
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {catalog.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}
