import type { MetadataRoute } from "next";

export type SitemapProduct = { slug: string; updatedAt: Date | null };
export type SitemapPost = { slug: string; date: string };

/**
 * Entradas del sitemap. Pura (sin base de datos) para poder probarla.
 * Solo incluye páginas que SÍ se pueden indexar: el inicio, la tienda, cada
 * producto activo y, solo cuando los textos legales ya fueron revisados, los
 * términos y la privacidad. Colecciones, carrito, cuenta y checkout quedan fuera
 * (llevan noindex o son privados).
 */
export function buildSitemapEntries(opts: { baseUrl: string; now: Date; products: SitemapProduct[]; includeLegal: boolean; posts?: SitemapPost[] }): MetadataRoute.Sitemap {
  const base = opts.baseUrl.replace(/\/+$/, "");
  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: opts.now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/shop`, lastModified: opts.now, changeFrequency: "daily", priority: 0.9 },
  ];
  for (const p of opts.products) {
    entries.push({ url: `${base}/shop/${encodeURIComponent(p.slug)}`, lastModified: p.updatedAt ?? opts.now, changeFrequency: "weekly", priority: 0.8 });
  }
  const posts = opts.posts ?? [];
  if (posts.length > 0) {
    const latest = posts.map((p) => new Date(`${p.date}T00:00:00Z`)).sort((a, b) => b.getTime() - a.getTime())[0];
    entries.push({ url: `${base}/blog`, lastModified: latest, changeFrequency: "weekly", priority: 0.6 });
    for (const post of posts) entries.push({ url: `${base}/blog/${encodeURIComponent(post.slug)}`, lastModified: new Date(`${post.date}T00:00:00Z`), changeFrequency: "monthly", priority: 0.7 });
  }
  if (opts.includeLegal) {
    entries.push({ url: `${base}/terminos`, lastModified: opts.now, changeFrequency: "yearly", priority: 0.2 });
    entries.push({ url: `${base}/privacidad`, lastModified: opts.now, changeFrequency: "yearly", priority: 0.2 });
  }
  return entries;
}
