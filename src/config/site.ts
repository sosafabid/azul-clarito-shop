/**
 * Configuración PÚBLICA de la tienda (segura para usar en servidor y cliente).
 * Un solo lugar para nombre, dominio, moneda, contacto y redes: no repetir
 * estos valores en componentes.
 *
 * Solo puede leer variables `NEXT_PUBLIC_*`. Lo que sea sensible va en
 * `src/config/server.ts`.
 */
import { DEFAULT_CURRENCY } from "@/domain/money";

export const siteConfig = {
  name: "Azul Clarito Shop",
  shortName: "Azul Clarito",
  tagline: "Un universo de objetos, música, libros y piezas especiales.",
  description:
    "Tienda oficial de Azul Clarito: objetos, música, libros y piezas especiales desde Limón, Costa Rica.",

  /** Dominio de la tienda. En Vercel se define con NEXT_PUBLIC_SITE_URL. */
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://shop.azulclaritocr.com",
  /** Sitio principal de la artista (proyecto aparte). */
  mainSiteUrl: "https://azulclaritocr.com",

  locale: "es_CR",
  language: "es",

  currency: DEFAULT_CURRENCY,

  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "mariamayaceleste@gmail.com",
  },

  /** Redes oficiales (las mismas del sitio principal). */
  social: {
    instagram: "https://www.instagram.com/mariamayaceleste",
    tiktok: "https://www.tiktok.com/@mariamayaceleste",
    threads: "https://www.threads.net/@mariamayaceleste",
    youtube: "https://www.youtube.com/@mariacelesteamaya",
  },

  /** Envíos: la primera versión es MANUAL (sin APIs de transportistas). */
  shipping: {
    mode: "manual",
    defaultCountry: "CR",
  },
} as const;

export type SiteConfig = typeof siteConfig;
