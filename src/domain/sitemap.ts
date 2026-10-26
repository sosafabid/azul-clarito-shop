import type { MetadataRoute } from "next";

export type SitemapProduct = { slug: string; updatedAt: Date | null };

/**
 * Entradas del sitemap. Pura (sin base de datos) para poder probarla.
 * Solo incluye páginas que SÍ se pueden indexar: el inicio, la tienda, cada
 * producto activo y, solo cuando los textos legales ya fueron revisados, los
 * términos y la privacidad. Colecciones, carrito, cuenta y checkout quedan fuera
 * (llevan noindex o son privados).
 */
export function buildSitemapEntries(opts: { baseUrl: string; now: Date; products: SitemapProduct[]; includeLegal: boolean }): MetadataRoute.Sitemap {
  const base = opts.baseUrl.replace(/\/+$/, "");
  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: opts.now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/shop`, lastModified: opts.now, changeFrequency: "daily", priority: 0.9 },
  ];
  for (const p of opts.products) {
    entries.push({ url: `${base}/shop/${encodeURIComponent(p.slug)}`, lastModified: p.updatedAt ?? opts.now, changeFrequency: "weekly", priority: 0.8 });
  }
  if (opts.includeLegal) {
    entries.push({ url: `${base}/terminos`, lastModified: opts.now, changeFrequency: "yearly", priority: 0.2 });
    entries.push({ url: `${base}/privacidad`, lastModified: opts.now, changeFrequency: "yearly", priority: 0.2 });
  }
  return entries;
}
