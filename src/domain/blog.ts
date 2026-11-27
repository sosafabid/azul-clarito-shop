/**
 * Diario Azul: tipos y utilidades PURAS del blog (sin base de datos ni React),
 * para poder probarlas. El contenido de cada artículo vive en `src/content/blog/`.
 */

export type BlogBlock =
  | { type: "p"; text: string }
  /** Subtítulo H3 dentro de una sección (H2). */
  | { type: "h3"; text: string }
  /** Cita o detalle destacado, estilo revista. */
  | { type: "quote"; text: string }
  | { type: "list"; items: string[] }
  | { type: "bullets"; items: { lead: string; text: string }[] }
  | { type: "faceGuide"; items: { shape: string; text: string }[] }
  | { type: "styleGuide"; items: { name: string; text: string }[] }
  | { type: "tips"; items: { title: string; text: string }[] }
  | { type: "models"; items: BlogModel[] };

/** Un producto real de la tienda: nombre, foto y precio salen de la base de datos; aquí solo va lo editorial. */
export type BlogModel = {
  slug: string;
  /** Nombre de respaldo, por si la tienda no responde al cargar el artículo. */
  name: string;
  /** Descripción visual confirmada del producto (la misma de su ficha). Opcional. */
  visual?: string;
  /** Texto editorial; nunca debe afirmar medidas, materiales ni protección UV. */
  text: string;
};

export type BlogSection = { id: string; title: string; blocks: BlogBlock[] };

export type BlogFaq = { question: string; answer: string; link?: { label: string; href: string } };

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
  /**
   * Imagen de portada OBLIGATORIA (archivo en /public). Se usa igual en la tarjeta del índice, en la cabecera del
   * artículo y al compartir en redes. `position` (CSS object-position, p. ej. "50% 30%") ajusta el encuadre del recorte 16:9.
   */
  image: { src: string; alt: string; width: number; height: number; position?: string };
  /** Verbo del botón de cada producto ("Ver" por defecto). */
  modelCtaVerb?: string;
  keywords: string[];
  intro: string[];
  sections: BlogSection[];
  cta: { title: string; text: string; label: string };
  faq: BlogFaq[];
};

export const BLOG_AUTHOR = "Azul Clarito";

/** Proporción fija de todas las portadas (tarjeta y cabecera del artículo). */
export const COVER_ASPECT = 16 / 9;

const COVER_EXTENSIONS = /\.(webp|jpe?g|png|avif)$/i;

/**
 * Reglas de publicación de un artículo (puras, sin tocar el disco). Devuelve los problemas en español;
 * vacío = se puede publicar. La existencia del archivo de la portada la comprueba `scripts/check-blog.ts`.
 * Regla permanente: ningún artículo se publica sin portada con foto y texto alternativo descriptivo.
 */
export function validateBlogPost(post: BlogPost): string[] {
  const issues: string[] = [];
  const image = post.image as BlogPost["image"] | undefined;
  if (!image || !image.src) {
    issues.push("Falta la imagen de portada (image).");
  } else {
    if (!image.src.startsWith("/") || !COVER_EXTENSIONS.test(image.src)) issues.push("La portada debe ser un archivo de imagen dentro de /public (ruta que empiece con \"/\" y termine en .webp, .jpg, .png o .avif).");
    if (!image.alt || image.alt.trim().length < 25) issues.push("La portada necesita un texto alternativo descriptivo (mínimo 25 caracteres).");
    if (!(image.width > 0) || !(image.height > 0)) issues.push("La portada necesita su ancho y alto reales en píxeles.");
    else if (image.width / image.height < 1.5) issues.push("La portada debe ser horizontal (como mínimo 3:2) para recortarse bien a 16:9 sin deformarse.");
    else if (image.width < 800) issues.push("La portada es muy pequeña: usa al menos 800 px de ancho.");
  }
  if (!post.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) issues.push("El slug no es válido (solo minúsculas, números y guiones).");
  if (!post.metaTitle || !post.metaDescription) issues.push("Faltan el meta title o la meta description.");
  return issues;
}

/** Enlaces internos dentro del texto: `[texto](/ruta)`. Solo rutas del propio sitio (empiezan con "/"). */
export const INLINE_LINK = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;

export type InlinePart = { text: string; href?: string };

/** Parte un texto en trozos normales y enlaces internos (puro, para poder probarlo). */
export function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_LINK)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ text: text.slice(last, index) });
    parts.push({ text: match[1], href: match[2] });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** Texto sin la sintaxis de enlaces (para contar palabras). */
export function stripInline(text: string): string {
  return parseInline(text).map((part) => part.text).join("");
}

/** Rutas internas que enlaza un artículo en su texto, en orden y sin repetir. */
export function inlineLinksOf(post: BlogPost): string[] {
  const hrefs: string[] = [];
  const texts: string[] = [...post.intro];
  for (const section of post.sections) for (const block of section.blocks) if (block.type === "p" || block.type === "quote") texts.push(block.text);
  for (const text of texts) for (const part of parseInline(text)) if (part.href && !hrefs.includes(part.href)) hrefs.push(part.href);
  return hrefs;
}

/** Minutos de lectura aproximados (200 palabras por minuto), mínimo 1. */
export function readingMinutes(post: BlogPost): number {
  const parts: string[] = [post.subtitle, ...post.intro];
  for (const section of post.sections) {
    parts.push(section.title);
    for (const block of section.blocks) {
      if (block.type === "p" || block.type === "h3" || block.type === "quote") parts.push(stripInline(block.text));
      else if (block.type === "list") parts.push(...block.items);
      else if (block.type === "faceGuide") parts.push(...block.items.map((i) => `${i.shape} ${i.text}`));
      else if (block.type === "bullets") parts.push(...block.items.map((i) => `${i.lead} ${i.text}`));
      else if (block.type === "styleGuide") parts.push(...block.items.map((i) => `${i.name} ${i.text}`));
      else if (block.type === "tips") parts.push(...block.items.map((i) => `${i.title} ${i.text}`));
      else parts.push(...block.items.map((i) => `${i.visual ?? ""} ${i.text}`));
    }
  }
  for (const f of post.faq) parts.push(f.question, f.answer, f.link?.label ?? "");
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
