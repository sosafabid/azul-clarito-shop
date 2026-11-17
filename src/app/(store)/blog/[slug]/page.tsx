import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody, type BlogProduct } from "@/components/blog/ArticleBody";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getBlogPost } from "@/content/blog";
import { getDb, isDatabaseConfigured } from "@/db";
import { SLUG_PATTERN } from "@/domain/slug";
import { buildBlogPostingJsonLd, buildBreadcrumbJsonLd, formatPostDate, productSlugsOf, readingMinutes, serializeJsonLd } from "@/domain/blog";
import { listPublicProducts } from "@/server/services/catalog/queries";

// Las fotos y nombres de los productos salen de la tienda en cada visita, igual que en /shop.
export const dynamic = "force-dynamic";

const SOCIAL_IMAGE = "/brand/og-azul-clarito-shop.jpg";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = SLUG_PATTERN.test(slug) ? getBlogPost(slug) : undefined;
  if (!post) return { title: "Artículo no encontrado", robots: { index: false } };
  const path = routes.blogPost(post.slug);
  return {
    title: { absolute: post.metaTitle },
    description: post.metaDescription,
    keywords: post.keywords,
    authors: [{ name: post.author }],
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      locale: siteConfig.locale,
      siteName: siteConfig.name,
      title: post.metaTitle,
      description: post.metaDescription,
      url: path,
      publishedTime: post.date,
      authors: [post.author],
      section: post.category,
      images: [{ url: SOCIAL_IMAGE, width: 1200, height: 630, alt: "Azul Clarito, una tortuga marina entre las olas" }],
    },
    twitter: { card: "summary_large_image", title: post.metaTitle, description: post.metaDescription, images: [SOCIAL_IMAGE] },
  };
}

/** Nombre y foto reales de los modelos del artículo. Si la base no responde, el artículo se ve igual (con enlaces, sin fotos). */
async function loadProducts(slugs: string[]): Promise<Map<string, BlogProduct>> {
  const map = new Map<string, BlogProduct>();
  if (!isDatabaseConfigured()) return map;
  try {
    const items = await listPublicProducts(getDb());
    for (const item of items) {
      if (slugs.includes(item.slug)) map.set(item.slug, { slug: item.slug, name: item.name, imageUrl: item.imageUrl, imageAlt: item.imageAlt });
    }
  } catch (error) {
    console.error("blog: no se pudieron leer los productos del artículo", error);
  }
  return map;
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = SLUG_PATTERN.test(slug) ? getBlogPost(slug) : undefined;
  if (!post) notFound();

  const products = await loadProducts(productSlugsOf(post));
  const path = routes.blogPost(post.slug);
  const minutes = readingMinutes(post);
  const jsonLd = [
    buildBlogPostingJsonLd(post, path, { baseUrl: siteConfig.url, imageUrl: `${siteConfig.url}${SOCIAL_IMAGE}`, logoUrl: `${siteConfig.url}/brand/logo-icon.png`, publisherName: siteConfig.name }),
    buildBreadcrumbJsonLd(
      [
        { name: "Inicio", path: routes.home },
        { name: "Diario Azul", path: routes.blog },
        { name: post.title, path },
      ],
      siteConfig.url,
    ),
  ];

  return (
    <article>
      {jsonLd.map((data, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
      ))}

      <header className="bg-gradient-to-b from-celeste via-celeste/60 to-paper">
        <Container size="narrow" className="pb-6 pt-10 sm:pt-16">
          <nav aria-label="Ruta de navegación" className="text-sm text-navy/70">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <li><Link href={routes.home} className="underline-offset-4 hover:underline">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href={routes.blog} className="underline-offset-4 hover:underline">Diario Azul</Link></li>
            </ol>
          </nav>
          <p className="mt-8 inline-block rounded-full bg-sun px-4 py-1.5 font-display text-xs font-bold uppercase tracking-[0.14em] text-navy">{post.category}</p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.12] sm:text-5xl">{post.title}</h1>
          <p className="mt-5 text-xl leading-relaxed text-ink/80">{post.subtitle}</p>
          <p className="mt-6 text-sm text-navy/70">
            Por <strong className="font-semibold">{post.author}</strong> · <time dateTime={post.date}>{formatPostDate(post.date)}</time> · {minutes} min de lectura
          </p>
        </Container>
        <WaveDivider className="fill-paper" />
      </header>

      <Container size="narrow" className="pb-16 sm:pb-24">
        <nav aria-labelledby="indice-titulo" className="mb-12 rounded-3xl border border-celeste bg-paper p-6">
          <h2 id="indice-titulo" className="font-display text-sm font-bold uppercase tracking-[0.14em] text-navy/60">En este artículo</h2>
          <ol className="mt-3 space-y-2">
            {post.sections.map((section) => (
              <li key={section.id}><a href={`#${section.id}`} className="font-semibold text-navy underline-offset-4 hover:underline">{section.title}</a></li>
            ))}
            <li><a href="#preguntas" className="font-semibold text-navy underline-offset-4 hover:underline">Preguntas frecuentes</a></li>
          </ol>
        </nav>

        <ArticleBody post={post} products={products} />

        <aside aria-labelledby="cta-titulo" className="mt-16 rounded-[2rem] bg-navy px-6 py-10 text-center text-paper sm:px-10">
          <h2 id="cta-titulo" className="!text-paper text-3xl font-bold">{post.cta.title}</h2>
          <p className="mx-auto mt-3 max-w-xl leading-relaxed text-paper/85">{post.cta.text}</p>
          <ButtonLink href={routes.shop} variant="light" className="mt-6">{post.cta.label}</ButtonLink>
        </aside>

        <section id="preguntas" aria-labelledby="preguntas-titulo" className="mt-16 scroll-mt-24">
          <h2 id="preguntas-titulo" className="text-3xl font-bold sm:text-4xl">Preguntas frecuentes</h2>
          <div className="mt-6 divide-y divide-celeste/70 rounded-3xl border border-celeste">
            {post.faq.map((item) => (
              <details key={item.question} className="group p-5 sm:p-6">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-display text-lg font-bold text-navy [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span aria-hidden="true" className="mt-0.5 text-2xl leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-ink/85">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="mt-12">
          <Link href={routes.blog} className="font-semibold text-navy underline underline-offset-4">← Volver a Diario Azul</Link>
        </p>
      </Container>
    </article>
  );
}
