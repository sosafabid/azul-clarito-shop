/**
 * Diario Azul: tipos y utilidades PURAS del blog (sin base de datos ni React),
 * para poder probarlas. El contenido de cada artículo vive en `src/content/blog/`.
 */

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "faceGuide"; items: { shape: string; text: string }[] }
  | { type: "styleGuide"; items: { name: string; text: string }[] }
  | { type: "tips"; items: { title: string; text: string }[] }
  | { type: "models"; items: BlogModel[] };

/** Un producto real de la tienda: nombre, foto y precio salen de la base de datos; aquí solo va lo editorial. */
export type BlogModel = {
  slug: string;
  /** Nombre de respaldo, por si la tienda no responde al cargar el artículo. */
  name: string;
  /** Descripción visual confirmada del producto (la misma de su ficha). */
  visual: string;
  /** Texto editorial; nunca debe afirmar medidas, materiales ni protección UV. */
  text: string;
};

export type BlogSection = { id: string; title: string; blocks: BlogBlock[] };

export type BlogFaq = { question: string; answer: string };

export type BlogPost = {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  /** Fecha de publicación (AAAA-MM-DD). */
  date: string;
  author: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  intro: string[];
  sections: BlogSection[];
  cta: { title: string; text: string; label: string };
  faq: BlogFaq[];
};

export const BLOG_AUTHOR = "Azul Clarito";

/** Minutos de lectura aproximados (200 palabras por minuto), mínimo 1. */
export function readingMinutes(post: BlogPost): number {
  const parts: string[] = [post.subtitle, ...post.intro];
  for (const section of post.sections) {
    parts.push(section.title);
    for (const block of section.blocks) {
      if (block.type === "p") parts.push(block.text);
      else if (block.type === "list") parts.push(...block.items);
      else if (block.type === "faceGuide") parts.push(...block.items.map((i) => `${i.shape} ${i.text}`));
      else if (block.type === "styleGuide") parts.push(...block.items.map((i) => `${i.name} ${i.text}`));
      else if (block.type === "tips") parts.push(...block.items.map((i) => `${i.title} ${i.text}`));
      else parts.push(...block.items.map((i) => `${i.visual} ${i.text}`));
    }
  }
  for (const f of post.faq) parts.push(f.question, f.answer);
  const words = parts.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Slugs de los productos que cita un artículo, sin repetir y en orden de aparición. */
export function productSlugsOf(post: BlogPost): string[] {
  const slugs: string[] = [];
  for (const section of post.sections) {
    for (const block of section.blocks) {
      if (block.type !== "models") continue;
      for (const model of block.items) if (!slugs.includes(model.slug)) slugs.push(model.slug);
    }
  }
  return slugs;
}

/** Fecha legible en español de Costa Rica, p. ej. "17 de noviembre de 2026" (sin depender de la zona horaria del servidor). */
export function formatPostDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

const abs = (baseUrl: string, path: string) => `${baseUrl.replace(/\/+$/, "")}${path}`;

type JsonLdOptions = { baseUrl: string; imageUrl: string; logoUrl: string; publisherName: string };

/** Datos estructurados BlogPosting: solo información real del artículo (sin ratings, sin autor inventado). */
export function buildBlogPostingJsonLd(post: BlogPost, postPath: string, opts: JsonLdOptions) {
  const url = abs(opts.baseUrl, postPath);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription,
    inLanguage: "es-CR",
    datePublished: post.date,
    dateModified: post.date,
    image: [opts.imageUrl],
    keywords: post.keywords.join(", "),
    articleSection: post.category,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    author: { "@type": "Organization", name: post.author, url: opts.baseUrl },
    publisher: { "@type": "Organization", name: opts.publisherName, url: opts.baseUrl, logo: { "@type": "ImageObject", url: opts.logoUrl } },
  };
}

export function buildBreadcrumbJsonLd(items: { name: string; path: string }[], baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: abs(baseUrl, item.path) })),
  };
}

/** Serializa JSON-LD para un <script>: escapa `<` para que ningún texto pueda cerrar la etiqueta. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
