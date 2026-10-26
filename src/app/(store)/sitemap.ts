import { and, eq } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { legalConfig } from "@/config/legal";
import { getDb, isDatabaseConfigured } from "@/db";
import { products } from "@/db/schema";
import { buildSitemapEntries, type SitemapProduct } from "@/domain/sitemap";

// Lee los productos activos en cada petición: un producto nuevo aparece sin redeploy.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let list: SitemapProduct[] = [];
  if (isDatabaseConfigured()) {
    try {
      list = await getDb().select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).where(and(eq(products.status, "ACTIVE"))).orderBy(products.slug);
    } catch (error) {
      // Si la base falla, mejor un sitemap parcial (inicio y tienda) que un error 500.
      console.error("sitemap: no se pudieron leer los productos", error);
    }
  }
  return buildSitemapEntries({ baseUrl: siteConfig.url, now: new Date(), products: list, includeLegal: legalConfig.reviewed });
}
