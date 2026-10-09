import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, isKeyInScope, parseImageItems, sniffImageType, validateImageFile } from "./images";

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);
const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const PRODUCT = "33333333-3333-4333-8333-333333333333";
const FILE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const HOST = "https://abc123.public.blob.vercel-storage.com";

describe("tipo real de la imagen (firma de bytes)", () => {
  it("reconoce JPG, PNG, WebP y AVIF", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp");
    expect(sniffImageType(bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66))).toBe("image/avif");
  });
  it("rechaza ejecutables, SVG, HTML, GIF y vacíos aunque se llamen .jpg", () => {
    expect(sniffImageType(bytes(0x4d, 0x5a, 0x90, 0x00))).toBeNull(); // .exe
    expect(sniffImageType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("<html><script>alert(1)</script></html>"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("GIF89a......"))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
    expect(sniffImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45))).toBeNull(); // WAV
  });
});

describe("tamaño y tipo declarados", () => {
  it("4 MB exactos pasan; un byte más no", () => {
    expect(validateImageFile({ type: "image/jpeg", size: MAX_IMAGE_BYTES })).toBeNull();
    expect(validateImageFile({ type: "image/jpeg", size: MAX_IMAGE_BYTES + 1 })).toMatch(/máximo es 4 MB/);
    expect(validateImageFile({ type: "application/pdf", size: 100 })).toMatch(/JPG, PNG, WebP o AVIF/);
  });
});

describe("pertenencia de los archivos subidos", () => {
  const pending = { kind: "pending", userId: USER } as const;
  it("la clave pendiente solo es de quien la subió", () => {
    expect(isKeyInScope(`products/pending/${USER}/${FILE}.jpg`, pending)).toBe(true);
    expect(isKeyInScope(`products/pending/${OTHER}/${FILE}.jpg`, pending)).toBe(false);
    expect(isKeyInScope(`products/${PRODUCT}/${FILE}.jpg`, pending)).toBe(false);
    expect(isKeyInScope(`products/pending/${USER}/${FILE}.exe`, pending)).toBe(false);
    expect(isKeyInScope(`products/pending/${USER}/../${FILE}.jpg`, pending)).toBe(false);
  });
  it("un id que no es UUID nunca entra en la expresión regular", () => {
    expect(isKeyInScope("products/.*/x.jpg", { kind: "product", productId: ".*" })).toBe(false);
  });
});

describe("lista de imágenes del formulario", () => {
  const scopes = [{ kind: "pending", userId: USER } as const];
  const own = { url: `${HOST}/products/pending/${USER}/${FILE}.png`, storageKey: `products/pending/${USER}/${FILE}.png` };
  it("acepta archivos propios y URLs externas, en orden y sin duplicados", () => {
    const result = parseImageItems(JSON.stringify([own, { url: "https://cdn.ejemplo.com/a.jpg" }, own]), scopes);
    expect(result).toEqual({ ok: true, items: [own, { url: "https://cdn.ejemplo.com/a.jpg" }] });
  });
  it("rechaza claves ajenas, URLs que no coinciden con la clave y otros hosts", () => {
    const foreign = { url: `${HOST}/products/pending/${OTHER}/${FILE}.png`, storageKey: `products/pending/${OTHER}/${FILE}.png` };
    const otherProduct = { url: `${HOST}/products/${PRODUCT}/${FILE}.png`, storageKey: `products/${PRODUCT}/${FILE}.png` };
    const mismatch = { url: `${HOST}/products/pending/${USER}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png`, storageKey: own.storageKey };
    const evil = { url: `https://evil.example.com/products/pending/${USER}/${FILE}.png`, storageKey: own.storageKey };
    for (const item of [foreign, otherProduct, mismatch, evil]) expect(parseImageItems(JSON.stringify([item]), scopes).ok).toBe(false);
  });
  it("rechaza JSON roto, http, más de 10 elementos y valores que no son objetos", () => {
    expect(parseImageItems("{no", scopes).ok).toBe(false);
    expect(parseImageItems(JSON.stringify([{ url: "http://x.com/a.jpg" }]), scopes).ok).toBe(false);
    expect(parseImageItems(JSON.stringify(Array.from({ length: 11 }, (_, i) => ({ url: `https://x.com/${i}.jpg` }))), scopes).ok).toBe(false);
    expect(parseImageItems(JSON.stringify([null, 5]), scopes).ok).toBe(false);
    expect(parseImageItems("", scopes)).toEqual({ ok: true, items: [] });
  });
});
