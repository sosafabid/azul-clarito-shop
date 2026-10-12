import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogFilters } from "@/components/shop/CatalogFilters";
import { ProductCard } from "@/components/shop/ProductCard";
import { Container } from "@/components/ui/Container";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { parseCatalogSelection } from "@/domain/catalog-filters";
import { SLUG_PATTERN } from "@/domain/slug";
import { getCatalogFacets, getPublicCollection } from "@/server/services/catalog/facets";
import { listPublicProducts } from "@/server/services/catalog/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Colección", robots: { index: false, follow: true } };

/** Página propia de una colección: sus productos, con el filtro de categoría combinable. */
export default async function CollectionPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug) || !isDatabaseConfigured()) notFound();
  const db = getDb();
  const collection = await getPublicCollection(db, slug);
  if (!collection) notFound();

  const selection = { category: parseCatalogSelection(await searchParams).category, collection: slug };
  const [catalog, facets] = await Promise.all([listPublicProducts(db, { categorySlug: selection.category, collectionSlug: slug }), getCatalogFacets(db, selection)]);
  const base = routes.shopCollection(slug);

  return (
    <section className="bg-paper py-14 sm:py-20">
      <Container>
        <Link href={routes.shop} className="text-sm font-semibold text-navy underline underline-offset-4">
          ← Volver a la tienda
        </Link>
        <p className="mt-6 font-display text-sm font-bold uppercase tracking-[0.14em] text-navy/60">Colección</p>
        <h1 className="mt-1 text-4xl font-bold sm:text-5xl">{collection.name}</h1>
        {collection.description && <p className="mt-3 max-w-xl text-lg text-ink/75">{collection.description}</p>}

        <div className="mt-8">
          <CatalogFilters basePath={base} selection={selection} categories={facets.categories} total={catalog.length} />
        </div>

        {catalog.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-celeste p-6 text-ink/75">
            Esta colección todavía no tiene productos publicados{selection.category ? " en esa categoría" : ""}.{" "}
            <Link href={selection.category ? base : routes.shop} className="font-semibold text-navy underline underline-offset-4">
              {selection.category ? "Ver toda la colección" : "Ver la tienda"}
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
