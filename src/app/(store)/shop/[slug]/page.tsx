import type { Metadata } from "next";
import { INTERNATIONAL_COLLECTION_SLUG } from "@/domain/shipping";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { TrackViewItem } from "@/components/analytics/TrackEvents";
import { AddToCartForm } from "@/components/shop/AddToCartForm";
import { AvailabilityBadge } from "@/components/shop/AvailabilityBadge";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Container } from "@/components/ui/Container";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { analyticsItem } from "@/domain/analytics";
import { variantLabel } from "@/domain/cart";
import { sizeValueOf } from "@/domain/sizes";
import { formatMoney, toCurrency } from "@/domain/money";
import { SLUG_PATTERN } from "@/domain/slug";
import { buildProductJsonLd, productMetaDescription } from "@/domain/product-seo";
import { serializeJsonLd, buildBreadcrumbJsonLd } from "@/domain/blog";
import { siteConfig } from "@/config/site";
import { getPublicProductBySlug } from "@/server/services/catalog/queries";

// Los datos salen de la base de datos en cada visita (aún sin caché).
export const dynamic = "force-dynamic";

// Se usa en generateMetadata y en la página: `cache` evita consultar dos veces por petición.
const loadProduct = cache(async (slug: string) => getPublicProductBySlug(getDb(), slug));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const base: Metadata = {};
  if (!SLUG_PATTERN.test(slug) || !isDatabaseConfigured()) return { ...base, title: "Producto" };
  const product = await loadProduct(slug);
  if (!product) return { ...base, title: "Producto" };
  const description = productMetaDescription(product);
  const image = product.imageUrl ?? product.images[0]?.url;
  return {
    ...base,
    title: product.name,
    description,
    alternates: { canonical: routes.product(product.slug) },
    openGraph: { type: "website", url: routes.product(product.slug), title: `${product.name} · ${siteConfig.name}`, description, ...(image ? { images: [{ url: image, alt: product.imageAlt ?? product.name }] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title: product.name, description, ...(image ? { images: [image] } : {}) },
  };
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

  // La foto principal va primero; las demás, en su orden. Todas se pueden ver en grande.
  const galleryImages = [
    ...(product.imageUrl ? [{ id: "main", url: product.imageUrl, alt: product.imageAlt ?? product.name }] : []),
    ...product.images.filter((image) => image.url !== product.imageUrl).map((image) => ({ id: image.id, url: image.url, alt: image.alt ?? product.name })),
  ];
  const soldOut = product.availability === "out_of_stock";
  const viewItem = analyticsItem({ sku: product.sku, name: product.name, unitPrice: product.price, currency: product.currency, category: product.categoryName });

  const seoProduct = {
    slug: product.slug, sku: product.sku, name: product.name, shortDescription: product.shortDescription, description: product.description, price: product.price, currency: product.currency,
    availability: product.availability, categoryName: product.categoryName, images: galleryImages.map((image) => ({ url: image.url, alt: image.alt })), variants: product.variants.map((variant) => ({ price: variant.price })),
  };
  const jsonLd = [
    buildProductJsonLd(seoProduct, { baseUrl: siteConfig.url }),
    buildBreadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Tienda", path: routes.shop }, { name: product.name, path: routes.product(product.slug) }], siteConfig.url),
  ];

  return (
    <section className="bg-paper py-10 sm:py-16">
      {jsonLd.map((data, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
      ))}
      <Container>
        <Link href={routes.shop} className="text-sm font-semibold text-navy underline underline-offset-4">
          ← Volver a la tienda
        </Link>

        <div className="mt-6 grid gap-10 md:grid-cols-2">
          <ProductGallery images={galleryImages} productName={product.name} />

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

            <TrackViewItem item={viewItem} currency={product.currency} />
            <AddToCartForm
              productId={product.id}
              soldOut={soldOut}
              tracking={{
                sku: product.sku,
                name: product.name,
                category: product.categoryName,
                currency: product.currency,
                price: product.price,
                variants: Object.fromEntries(product.variants.map((variant) => [variant.id, { price: variant.price ?? product.price, label: variantLabel(variant) }])),
              }}
              options={product.variants.map((variant) => ({
                id: variant.id,
                label: variantLabel(variant),
                priceLabel: variant.price !== null ? formatMoney(variant.price, toCurrency(product.currency)) : null,
                availability: variant.availability,
                size: sizeValueOf(variant.options),
              }))}
            />
            {product.productType !== "DIGITAL" && (
              <p className="mt-4 text-sm text-ink/70">
                {product.collections.some((collection) => collection.slug === INTERNATIONAL_COLLECTION_SLUG)
                  ? "Envío a Costa Rica y a países de América."
                  : "Envío solo dentro de Costa Rica."}
              </p>
            )}
            {product.productType === "DIGITAL" && (
              <p className="mt-4 rounded-2xl bg-aqua/15 p-4 text-sm leading-relaxed text-navy">
                <strong>Libro digital (PDF).</strong> Sin envío: apenas se confirme tu pago podés descargarlo desde la página de tu pedido y te enviamos el enlace por correo.
              </p>
            )}
            {product.collections.length > 0 && (
              <p className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                {product.collections.map((collection) => (
                  <Link key={collection.id} href={routes.shopCollection(collection.slug)} className="rounded-full border border-celeste px-3 py-1 font-semibold text-navy hover:border-navy">
                    {collection.name}
                  </Link>
                ))}
              </p>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
