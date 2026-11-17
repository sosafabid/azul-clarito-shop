import type { Metadata } from "next";
import Link from "next/link";
import { PostCover } from "@/components/blog/PostCover";
import { Container } from "@/components/ui/Container";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { BLOG_POSTS } from "@/content/blog";
import { buildBreadcrumbJsonLd, formatPostDate, readingMinutes, serializeJsonLd } from "@/domain/blog";

const DESCRIPTION = "Diario Azul: ideas, estilo y notas de verano desde Azul Clarito, en Limón, Costa Rica.";

export const metadata: Metadata = {
  title: { absolute: "Diario Azul | Azul Clarito" },
  description: DESCRIPTION,
  alternates: { canonical: routes.blog },
  robots: { index: true, follow: true },
  openGraph: { type: "website", locale: siteConfig.locale, siteName: siteConfig.name, title: "Diario Azul | Azul Clarito", description: DESCRIPTION, url: routes.blog, images: [{ url: "/brand/og-azul-clarito-shop.jpg", width: 1200, height: 630, alt: "Azul Clarito, una tortuga marina entre las olas" }] },
  twitter: { card: "summary_large_image", title: "Diario Azul | Azul Clarito", description: DESCRIPTION, images: ["/brand/og-azul-clarito-shop.jpg"] },
};

export default function BlogIndexPage() {
  const breadcrumb = buildBreadcrumbJsonLd([{ name: "Inicio", path: routes.home }, { name: "Diario Azul", path: routes.blog }], siteConfig.url);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
      <header className="bg-gradient-to-b from-celeste via-celeste/60 to-paper">
        <Container className="pb-6 pt-12 sm:pt-20">
          <p className="font-display text-sm font-bold uppercase tracking-[0.14em] text-navy/60">Entre mar, estilo y canciones</p>
          <h1 className="mt-3 text-5xl font-bold sm:text-6xl">Diario Azul</h1>
          <p className="mt-4 max-w-xl text-xl leading-relaxed text-ink/80">Ideas, guías y notas de verano desde Azul Clarito, para llevar un poquito del Caribe a tu día a día.</p>
        </Container>
        <WaveDivider className="fill-paper" />
      </header>

      <Container className="pb-20 pt-6 sm:pb-28">
        <ul className="grid gap-8 md:grid-cols-2">
          {BLOG_POSTS.map((post) => (
            <li key={post.slug}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-celeste bg-paper transition-shadow hover:shadow-soft">
                <div className="relative overflow-hidden rounded-t-3xl">
                  <PostCover post={post} sizes="(min-width: 768px) 560px, 100vw" imageClassName="transition-transform duration-300 motion-safe:group-hover:scale-[1.03]" />
                  <span className="absolute bottom-4 left-4 rounded-full bg-sun px-4 py-1.5 font-display text-xs font-bold uppercase tracking-[0.14em] text-navy shadow-sm">{post.category}</span>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-6 sm:p-7">
                  <h2 className="text-2xl font-bold leading-snug">
                    <Link href={routes.blogPost(post.slug)} className="after:absolute after:inset-0 hover:underline">{post.title}</Link>
                  </h2>
                  <p className="leading-relaxed text-ink/80">{post.metaDescription}</p>
                  <p className="mt-auto pt-2 text-sm text-navy/70">
                    <time dateTime={post.date}>{formatPostDate(post.date)}</time> · {readingMinutes(post)} min de lectura
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
