import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * Sitemap. Hoy solo contiene el inicio, porque /shop todavía no tiene
 * contenido. Cuando exista el catálogo, agregar aquí /shop y una entrada por
 * cada producto ACTIVO (leyendo el slug desde la base de datos).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteConfig.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
