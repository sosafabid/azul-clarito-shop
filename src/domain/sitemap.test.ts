import { describe, expect, it } from "vitest";
import { buildSitemapEntries } from "./sitemap";

const now = new Date("2026-10-26T12:00:00Z");
const updated = new Date("2026-10-20T00:00:00Z");

describe("buildSitemapEntries", () => {
  it("incluye inicio, tienda y productos con su fecha", () => {
    const e = buildSitemapEntries({ baseUrl: "https://shop.example.com/", now, products: [{ slug: "libro-uno", updatedAt: updated }, { slug: "jabón", updatedAt: null }], includeLegal: false });
    expect(e.map((x) => x.url)).toEqual(["https://shop.example.com", "https://shop.example.com/shop", "https://shop.example.com/shop/libro-uno", "https://shop.example.com/shop/jab%C3%B3n"]);
    expect(e[2].lastModified).toEqual(updated);
    expect(e[3].lastModified).toEqual(now);
  });
  it("omite términos y privacidad mientras no estén revisados", () => {
    expect(buildSitemapEntries({ baseUrl: "https://x.cr", now, products: [], includeLegal: false }).some((x) => x.url.endsWith("/terminos"))).toBe(false);
    const urls = buildSitemapEntries({ baseUrl: "https://x.cr", now, products: [], includeLegal: true }).map((x) => x.url);
    expect(urls).toContain("https://x.cr/terminos");
    expect(urls).toContain("https://x.cr/privacidad");
  });
  it("nunca lista rutas privadas", () => {
    const urls = buildSitemapEntries({ baseUrl: "https://x.cr", now, products: [], includeLegal: true }).map((x) => x.url).join(" ");
    expect(urls).not.toMatch(/admin|account|cart|checkout|api|colecciones/);
  });
});
