import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AvailabilityBadge } from "@/components/shop/AvailabilityBadge";
import { ProductImage } from "@/components/shop/ProductImage";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Container } from "@/components/ui/Container";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { formatMoney, toCurrency } from "@/domain/money";
import { SLUG_PATTERN } from "@/domain/slug";
import { getPublicProductBySlug } from "@/server/services/catalog/queries";

// Los datos salen de la base de datos en cada visita (aún sin caché).
export const dynamic = "force-dynamic";

// Se usa en generateMetadata y en la página: `cache` evita consultar dos veces por petición.
const loadProduct = cache(async (slug: string) => getPublicProductBySlug(getDb(), slug));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const base: Metadata = {
    // La tienda aún no está lanzada: no indexar hasta el lanzamiento.
    robots: { index: false, follow: false },
  };
  if (!SLUG_PATTERN.test(slug) || !isDatabaseConfigured()) return { ...base, title: "Producto" };
  const product = await loadProduct(slug);
  if (!product) return { ...base, title: "Producto" };
  return { ...base, title: product.name, description: product.shortDescription ?? undefined };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Un slug válido son minúsculas, números y guiones. Cualquier otra cosa es 404.
  if (!SLUG_PATTERN.test(slug)) notFound();

  if (!isDatabaseConfigured()) {
    return (
      <ComingSoon
        title="Ficha de producto"
        description="Muy pronto vas a poder conocer cada pieza con todos sus detalles."
        back={{ label: "Volver a la tienda", href: routes.shop }}
      />
    );
  }

  const product = await loadProduct(slug);
  if (!product) notFound();

  const gallery = product.images.filter((image) => image.url !== product.imageUrl);
  const soldOut = product.availability === "out_of_stock";

  return (
    <section className="bg-paper py-10 sm:py-16">
      <Container>
        <Link href={routes.shop} className="text-sm font-semibold text-navy underline underline-offset-4">
          ← Volver a la tienda
        </Link>

        <div className="mt-6 grid gap-10 md:grid-cols-2">
          <div className="space-y-4">
            <ProductImage src={product.imageUrl} alt={product.imageAlt ?? product.name} className="rounded-3xl" sizes="(min-width: 768px) 50vw, 100vw" />
            {gallery.length > 0 && (
              <ul className="grid grid-cols-4 gap-3">
                {gallery.slice(0, 4).map((image) => (
                  <li key={image.id}>
                    <ProductImage src={image.url} alt={image.alt ?? product.name} className="rounded-xl" sizes="12vw" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            {product.categoryName && (
              <p className="font-display text-sm font-bold uppercase tracking-[0.14em] text-navy/60">{product.categoryName}</p>
            )}
            <h1 className="mt-2 text-4xl font-bold sm:text-5xl">{product.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="font-display text-3xl font-bold text-navy">{formatMoney(product.price, toCurrency(product.currency))}</span>
              <AvailabilityBadge availability={product.availability} />
            </div>

            {product.shortDescription && <p className="mt-6 text-lg leading-relaxed text-ink">{product.shortDescription}</p>}
            {product.description && <p className="mt-4 whitespace-pre-line leading-relaxed text-ink/80">{product.description}</p>}

            {product.variants.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-navy/60">Opciones disponibles</h2>
                <ul className="mt-3 space-y-2">
                  {product.variants.map((variant) => (
                    <li key={variant.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-celeste px-4 py-3">
                      <span className="font-display font-bold text-navy">
                        {variant.name || Object.values(variant.options).join(" / ")}
                        {variant.price !== null && (
                          <span className="ml-2 font-normal text-ink/70">{formatMoney(variant.price, toCurrency(product.currency))}</span>
                        )}
                      </span>
                      <AvailabilityBadge availability={variant.availability} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              disabled
              className="mt-8 inline-flex min-h-12 cursor-not-allowed items-center rounded-full bg-navy/50 px-8 py-3 font-display font-bold text-paper"
            >
              {soldOut ? "Agotado" : "Comprar — muy pronto"}
            </button>
            <p className="mt-3 text-sm text-ink/60">La compra en línea estará disponible próximamente.</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
