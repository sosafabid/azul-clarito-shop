import type { Metadata } from "next";
import { ProductCard } from "@/components/shop/ProductCard";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Container } from "@/components/ui/Container";
import { getDb, isDatabaseConfigured } from "@/db";
import { listPublicProducts } from "@/server/services/catalog/queries";

export const metadata: Metadata = {
  title: "Tienda",
  // La tienda aún no está lanzada: no indexar hasta el lanzamiento (quitar esta línea entonces).
  robots: { index: false, follow: true },
};

// Los datos salen de la base de datos en cada visita (aún sin caché).
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const catalog = isDatabaseConfigured() ? await listPublicProducts(getDb()) : [];

  if (catalog.length === 0) {
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
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {catalog.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ul>
      </Container>
    </section>
  );
}
