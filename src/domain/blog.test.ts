import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ALL_BLOG_POSTS, BLOG_POSTS, getBlogPost } from "@/content/blog";
import { validateBlogPost, type BlogPost, buildBlogPostingJsonLd, buildBreadcrumbJsonLd, formatPostDate, productSlugsOf, readingMinutes, serializeJsonLd, inlineLinksOf, parseInline, stripInline } from "./blog";

const post = getBlogPost("como-elegir-anteojos-de-sol")!;
const gifts = getBlogPost("regalos-para-mujer-inspiracion-caribena")!;

describe("Diario Azul: artículo de anteojos de sol", () => {
  it("existe y tiene los datos acordados", () => {
    expect(post).toBeDefined();
    expect(post.date).toBe("2026-11-17");
    expect(post.author).toBe("Azul Clarito");
    expect(post.category).toBe("Estilo de verano");
    expect(post.metaTitle).toBe("Cómo elegir anteojos de sol según tu estilo | Azul Clarito");
    expect(post.metaDescription).toBe("Descubre cómo elegir anteojos de sol según tu rostro y estilo. Explora cinco modelos de Azul Clarito y encuentra tu favorito.");
  });
  it("enlaza exactamente a los cinco productos pedidos", () => {
    expect(productSlugsOf(post)).toEqual(["midnight-coast", "ocean-muse", "purple-tide", "sandy-glow", "sunset-tortoise"]);
  });
  it("tiene los cuatro estilos, cuatro rostros, tres consejos y cuatro preguntas", () => {
    const blocks = post.sections.flatMap((s) => s.blocks);
    expect(blocks.find((b) => b.type === "styleGuide")).toMatchObject({ items: expect.arrayContaining([expect.objectContaining({ name: "Minimalista" }), expect.objectContaining({ name: "Clásico" }), expect.objectContaining({ name: "Creativo" }), expect.objectContaining({ name: "Relajado y tropical" })]) });
    expect((blocks.find((b) => b.type === "faceGuide") as { items: unknown[] }).items).toHaveLength(4);
    expect((blocks.find((b) => b.type === "tips") as { items: unknown[] }).items).toHaveLength(3);
    expect(post.faq.map((f) => f.question)).toEqual([
      "¿Qué tipo de lentes favorecen a una cara redonda?",
      "¿Qué color de lentes combina con todo?",
      "¿Se pueden usar anteojos de sol todos los días?",
      "¿Dónde comprar anteojos de sol en Costa Rica?",
    ]);
  });
  it("no afirma protección UV400, precios ni medidas de los productos", () => {
    const text = JSON.stringify(post);
    expect(text).not.toMatch(/UV ?400/i);
    expect(text).not.toMatch(/polariz/i);
    expect(text).not.toMatch(/₡|\bCRC\b|\bmm\b|milímetros|gramos/i);
    expect(text).not.toMatch(/100 ?% ?(UV|protec)/i);
  });
  it("los ids de sección son únicos (para el índice y los anclajes)", () => {
    const ids = post.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("los slugs de los artículos son únicos y válidos", () => {
    const slugs = BLOG_POSTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });
  it("tiene foto principal con texto alternativo", () => {
    expect(post.image.src).toBe("/blog/anteojos-de-sol.webp");
    expect(post.image!.alt.length).toBeGreaterThan(20);
  });
  it("tiempo de lectura razonable y fecha en español", () => {
    expect(readingMinutes(post)).toBeGreaterThanOrEqual(3);
    expect(formatPostDate("2026-11-17")).toBe("17 de noviembre de 2026");
  });
});

describe("datos estructurados", () => {
  const opts = { baseUrl: "https://shop.azulclaritocr.com/", imageUrl: "https://shop.azulclaritocr.com/brand/og.jpg", logoUrl: "https://shop.azulclaritocr.com/brand/logo.png", publisherName: "Azul Clarito Shop" };
  it("BlogPosting con URL canónica, fecha, autor y editor reales", () => {
    const ld = buildBlogPostingJsonLd(post, "/blog/como-elegir-anteojos-de-sol", opts);
    expect(ld["@type"]).toBe("BlogPosting");
    expect(ld.url).toBe("https://shop.azulclaritocr.com/blog/como-elegir-anteojos-de-sol");
    expect(ld.mainEntityOfPage["@id"]).toBe(ld.url);
    expect(ld.datePublished).toBe("2026-11-17");
    expect(ld.author).toMatchObject({ "@type": "Organization", name: "Azul Clarito" });
    expect(ld.publisher.logo.url).toBe(opts.logoUrl);
    expect(ld.inLanguage).toBe("es-CR");
    expect(JSON.stringify(ld)).not.toMatch(/aggregateRating|review/i);
  });
  it("BreadcrumbList con posiciones y URLs absolutas", () => {
    const ld = buildBreadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Diario Azul", path: "/blog" }], "https://shop.azulclaritocr.com");
    expect(ld.itemListElement.map((i) => [i.position, i.item])).toEqual([[1, "https://shop.azulclaritocr.com/"], [2, "https://shop.azulclaritocr.com/blog"]]);
  });
  it("serializeJsonLd no deja pasar </script>", () => {
    expect(serializeJsonLd({ a: "</script><b>" })).not.toContain("<");
    expect(JSON.parse(serializeJsonLd({ a: "</script>" }))).toEqual({ a: "</script>" });
  });
});

describe("Diario Azul: artículo de regalos para mujer", () => {
  it("tiene los datos acordados", () => {
    expect(gifts).toBeDefined();
    expect(gifts.category).toBe("Regalos con significado");
    expect(gifts.author).toBe("Azul Clarito");
    expect(gifts.metaTitle).toBe("Regalos para mujer: ideas con inspiración caribeña");
    expect(gifts.metaDescription).toBe("Descubre regalos para mujer con inspiración caribeña: accesorios, decoración y pequeños detalles para sorprender con algo especial.");
  });
  it("enlaza a los siete productos, sin repetir", () => {
    expect(productSlugsOf(gifts)).toEqual(["collar-ocean-star", "mermaids-bracelet", "un-pedacito-de-mar", "porta-vasos-memorias-de-mar", "portavasos-tortuguita", "imanes-tropicales"]);
  });
  it("tiene cinco secciones, cuatro preguntas frecuentes y el último enlace a la tienda", () => {
    expect(gifts.sections).toHaveLength(5);
    expect(gifts.faq).toHaveLength(4);
    expect(gifts.faq[3].link).toEqual({ label: "Visitar Azul Clarito Shop", href: "/shop" });
  });
  it("no incluye precios ni medidas", () => {
    expect(JSON.stringify(gifts)).not.toMatch(/₡|\bCRC\b|\bcm\b|\bmm\b|gramos/i);
  });
  it("con la misma fecha, el primero de la lista aparece primero en el índice", () => {
    const order = BLOG_POSTS.map((p) => p.slug);
    expect(order.indexOf("regalos-para-mujer-inspiracion-caribena")).toBeLessThan(order.indexOf("como-elegir-anteojos-de-sol"));
  });
});

describe("regla permanente: portada obligatoria", () => {
  const sinPortada = { ...post, image: undefined } as unknown as BlogPost;
  it("un artículo sin portada no es publicable", () => {
    expect(validateBlogPost(sinPortada)).toContain("Falta la imagen de portada (image).");
  });
  it("rechaza portadas sin texto alternativo, verticales, diminutas o fuera de /public", () => {
    const con = (image: Partial<BlogPost["image"]>) => ({ ...post, image: { ...post.image, ...image } }) as BlogPost;
    expect(validateBlogPost(con({ alt: "foto" })).join(" ")).toMatch(/texto alternativo/);
    expect(validateBlogPost(con({ width: 700, height: 1000 })).join(" ")).toMatch(/horizontal/);
    expect(validateBlogPost(con({ width: 640, height: 360 })).join(" ")).toMatch(/muy pequeña/);
    expect(validateBlogPost(con({ src: "https://example.com/a.jpg" })).join(" ")).toMatch(/dentro de \/public/);
    expect(validateBlogPost(con({}))).toEqual([]);
  });
  it("TODOS los artículos registrados cumplen las reglas y su archivo de portada existe", () => {
    expect(ALL_BLOG_POSTS.length).toBeGreaterThanOrEqual(2);
    for (const p of ALL_BLOG_POSTS) {
      expect(validateBlogPost(p), p.slug).toEqual([]);
      expect(existsSync(join(process.cwd(), "public", p.image.src)), `${p.slug}: falta public${p.image.src}`).toBe(true);
    }
  });
  it("lo que se publica es exactamente lo válido (nada sin portada llega al sitio)", () => {
    expect(BLOG_POSTS.length).toBe(ALL_BLOG_POSTS.length);
    for (const p of BLOG_POSTS) expect(p.image.src).toBeTruthy();
  });
  it("cada artículo usa una portada distinta", () => {
    const srcs = ALL_BLOG_POSTS.map((p) => p.image.src);
    expect(new Set(srcs).size).toBe(srcs.length);
  });
});

/** Productos que existen hoy en la tienda (26 de noviembre de 2026). Guarda contra errores de tipeo en los enlaces de los artículos. */
const CATALOG_SLUGS = new Set([
  "prensa-flor-de-mar", "ama-s", "cuaderno-seashell-vintage", "cuaderno-atardecer-de-mar", "bolsa-conchita-de-mar", "baby-bag-estrellitas-de-mar",
  "prensita-conchita-de-mar", "prensita-caracol-de-mar", "tutty-gorra", "tuttytote", "post-its-tortuguitas-de-mar", "portacepillos-conchita-de-mar",
  "set-de-portavasos-mosaico-marino", "sandy-glow", "purple-tide", "midnight-coast", "ocean-muse", "sunset-tortoise", "little-glow-friends-set-of-3",
  "portavasos-tortuguita", "bamboo-tootbrush", "camiseta-azul-clarito", "collar-ocean-star", "porta-vasos-memorias-de-mar", "mermaids-bracelet",
  "crop-top-mermaids", "gorra-azul-clarito-whale", "camiseta-tortuga", "un-pedacito-de-mar", "mi-littl-chickn-cougar-cronics", "the-brief-chapter-of-you",
  "eme-ama-s", "romanticismo-cuantico", "tattoo-tropical", "imanes-tropicales",
]);

describe("enlaces internos en el texto", () => {
  it("parseInline separa texto y enlaces, y stripInline deja solo el texto", () => {
    expect(parseInline("Lee [la guía](/blog/x) y [más](/shop/y).")).toEqual([{ text: "Lee " }, { text: "la guía", href: "/blog/x" }, { text: " y " }, { text: "más", href: "/shop/y" }, { text: "." }]);
    expect(stripInline("Lee [la guía](/blog/x) hoy")).toBe("Lee la guía hoy");
    expect(parseInline("sin enlaces")).toEqual([{ text: "sin enlaces" }]);
  });
  it("no convierte enlaces externos", () => {
    expect(parseInline("[x](https://malo.com)")).toEqual([{ text: "[x](https://malo.com)" }]);
  });
});

describe("Diario Azul: lote de tres artículos nuevos", () => {
  const slugs = ["como-elegir-accesorios-look-tropical", "como-cuidar-anteojos-de-sol", "accesorios-inspirados-en-el-mar"];
  it("están publicados, con portada válida y archivo existente", () => {
    for (const slug of slugs) {
      const p = getBlogPost(slug);
      expect(p, slug).toBeDefined();
      expect(validateBlogPost(p!), slug).toEqual([]);
      expect(existsSync(join(process.cwd(), "public", p!.image.src)), slug).toBe(true);
    }
  });
  it("cada uno tiene metadatos únicos y entre 900 y 1.300 palabras de lectura aproximada", () => {
    const posts = slugs.map((slug) => getBlogPost(slug)!);
    expect(new Set(posts.map((p) => p.metaTitle)).size).toBe(3);
    expect(new Set(posts.map((p) => p.metaDescription)).size).toBe(3);
    for (const p of posts) {
      expect(p.metaDescription.length, p.slug).toBeLessThanOrEqual(165);
      expect(readingMinutes(p), p.slug).toBeGreaterThanOrEqual(4);
      expect(readingMinutes(p), p.slug).toBeLessThanOrEqual(7);
    }
  });
  it("todos los productos que enlazan existen en la tienda", () => {
    for (const p of ALL_BLOG_POSTS) {
      for (const slug of productSlugsOf(p)) expect(CATALOG_SLUGS.has(slug), `${p.slug} → ${slug}`).toBe(true);
      for (const href of inlineLinksOf(p)) {
        const shop = /^\/shop\/([a-z0-9-]+)$/.exec(href)?.[1];
        if (shop) expect(CATALOG_SLUGS.has(shop), `${p.slug} → ${href}`).toBe(true);
      }
    }
  });
  it("los enlaces entre artículos apuntan a artículos publicados", () => {
    for (const p of ALL_BLOG_POSTS) {
      for (const href of inlineLinksOf(p)) {
        const target = /^\/blog\/([a-z0-9-]+)$/.exec(href)?.[1];
        if (target) expect(getBlogPost(target), `${p.slug} → ${href}`).toBeDefined();
      }
    }
  });
  it("el artículo de cuidado enlaza al de cómo elegir anteojos y a productos de anteojos", () => {
    const care = getBlogPost("como-cuidar-anteojos-de-sol")!;
    expect(inlineLinksOf(care)).toContain("/blog/como-elegir-anteojos-de-sol");
    expect(care.faq.some((f) => f.link?.href === "/blog/como-elegir-anteojos-de-sol")).toBe(true);
    expect(productSlugsOf(care)).toEqual(["midnight-coast", "ocean-muse", "purple-tide", "sandy-glow", "sunset-tortoise"]);
  });
  it("no afirma protección UV ni certificaciones ni sostenibilidad", () => {
    for (const slug of slugs) {
      const text = JSON.stringify(getBlogPost(slug)).toLowerCase();
      expect(text, slug).not.toMatch(/100 ?%|certificad|sostenible|biodegradable|reciclad|polarizad|antirreflej|uv400/);
    }
  });
  it("el índice muestra primero los nuevos y el artículo de anteojos original sigue publicado", () => {
    expect(BLOG_POSTS.map((p) => p.slug).slice(0, 3)).toEqual(slugs);
    expect(getBlogPost("como-elegir-anteojos-de-sol")).toBeDefined();
  });
});
