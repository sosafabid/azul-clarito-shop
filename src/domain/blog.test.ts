import { describe, expect, it } from "vitest";
import { BLOG_POSTS, getBlogPost } from "@/content/blog";
import { buildBlogPostingJsonLd, buildBreadcrumbJsonLd, formatPostDate, productSlugsOf, readingMinutes, serializeJsonLd } from "./blog";

const post = getBlogPost("como-elegir-anteojos-de-sol")!;

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
