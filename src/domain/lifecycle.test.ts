import { describe, expect, it } from "vitest";
import { changedProductFields, type ProductEditableFields } from "./product-audit";
import { describeUploadError, parseImageUrls, validateImageBatch, validateImageFile } from "./images";
import {
  availableActions,
  canApplyAction,
  deleteConfirmationMatches,
  escapeLike,
  parseProductFilter,
  parseSearch,
  statusesForFilter,
} from "./product-lifecycle";
import { parseOptions, parseVariantForm } from "./variant-form";
import { parseProductForm } from "./product-form";

describe("ciclo de vida del producto", () => {
  it("acciones disponibles según el estado", () => {
    expect(availableActions("ACTIVE")).toEqual(["hide", "archive"]);
    expect(availableActions("DRAFT")).toEqual(["publish", "archive"]);
    expect(availableActions("ARCHIVED")).toEqual(["restore"]);
  });
  it("transiciones inválidas se rechazan", () => {
    expect(canApplyAction("publish", "ACTIVE")).toBe(false);
    expect(canApplyAction("publish", "ARCHIVED")).toBe(false);
    expect(canApplyAction("restore", "ACTIVE")).toBe(false);
    expect(canApplyAction("hide", "DRAFT")).toBe(false);
  });
  it("filtros del listado", () => {
    expect(parseProductFilter("archivados")).toBe("archivados");
    expect(parseProductFilter("cualquier-cosa")).toBe("todos");
    expect(parseProductFilter(undefined)).toBe("todos");
    expect(statusesForFilter("activos")).toEqual(["ACTIVE"]);
    expect(statusesForFilter("ocultos")).toEqual(["DRAFT"]);
    expect(statusesForFilter("todos")).toHaveLength(3);
  });
  it("búsqueda: recorta, limita y escapa comodines", () => {
    expect(parseSearch("  camiseta  ")).toBe("camiseta");
    expect(parseSearch("x".repeat(300))).toHaveLength(100);
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
  });
  it("confirmar eliminación exige escribir el SKU", () => {
    expect(deleteConfirmationMatches(" cam-azu-01 ", "CAM-AZU-01")).toBe(true);
    expect(deleteConfirmationMatches("otro", "CAM-AZU-01")).toBe(false);
    expect(deleteConfirmationMatches("", "")).toBe(false);
  });
});

describe("imágenes", () => {
  it("valida tipo y tamaño de archivos", () => {
    expect(validateImageFile({ type: "image/png", size: 1000 })).toBeNull();
    expect(validateImageFile({ type: "image/gif", size: 1000 })).toMatch(/JPG, PNG, WebP o AVIF/);
    expect(validateImageFile({ type: "image/jpeg", size: 5 * 1024 * 1024 })).toMatch(/máximo es 4 MB/);
    expect(validateImageFile({ type: "image/jpeg", size: 0 })).toMatch(/vacío/);
  });
  it("el TOTAL de un envío también tiene tope (límite de la petición en Vercel)", () => {
    const mb = 1024 * 1024;
    expect(validateImageBatch([{ type: "image/png", size: 2 * mb }, { type: "image/png", size: 1 * mb }])).toBeNull();
    expect(validateImageBatch([{ type: "image/png", size: 3 * mb }, { type: "image/png", size: 3 * mb }])).toMatch(/suman 6\.0 MB/);
    expect(validateImageBatch([{ type: "image/gif", size: 10, name: "a.gif" }])).toMatch(/a\.gif: Solo se aceptan/);
  });
  it("errores del almacenamiento → mensajes útiles", () => {
    const named = (name: string, message: string) => Object.assign(new Error(message), { name });
    expect(describeUploadError(named("BlobAccessError", "Access denied, please provide a valid token"))).toMatch(/rechazó el acceso/);
    expect(describeUploadError(named("BlobStoreNotFoundError", "This store does not exist."))).toMatch(/Blob store/);
    expect(describeUploadError(new Error("Cannot use public access on a private store"))).toMatch(/privado/);
    expect(describeUploadError(named("BlobRequestAbortedError", "The request was aborted."))).toMatch(/tardó demasiado/);
    expect(describeUploadError("boom")).toMatch(/No se pudo subir/);
  });
  it("URLs: solo https, sin credenciales, sin duplicados", () => {
    const r = parseImageUrls("https://cdn.ejemplo.com/a.jpg\nhttps://cdn.ejemplo.com/a.jpg, https://cdn.ejemplo.com/b.png");
    expect(r.urls).toEqual(["https://cdn.ejemplo.com/a.jpg", "https://cdn.ejemplo.com/b.png"]);
    expect(r.errors).toEqual([]);
    expect(parseImageUrls("http://inseguro.com/a.jpg").errors[0]).toMatch(/https/);
    expect(parseImageUrls("https://user:pass@x.com/a.jpg").errors[0]).toMatch(/usuario/);
    expect(parseImageUrls("javascript:alert(1)").errors).toHaveLength(1);
    expect(parseImageUrls("no-es-una-url").errors).toHaveLength(1);
  });
});

describe("variantes", () => {
  it("opciones Clave: valor", () => {
    expect(parseOptions("Talla: M\nColor = Azul").options).toEqual({ Talla: "M", Color: "Azul" });
    expect(parseOptions("sin separador").error).toMatch(/Clave: valor/);
  });
  it("arma el nombre desde las opciones y valida SKU, precio y costo", () => {
    const r = parseVariantForm({ sku: "CAM-M", options: "Talla: M\nColor: Azul", availableStock: "4", price: "13.000", cost: "5000", isActive: "on" }, "CRC");
    expect(r.ok && r.data).toMatchObject({ name: "M / Azul", sku: "CAM-M", price: 13000, cost: 5000, availableStock: 4, isActive: true });
  });
  it("precio y costo vacíos significan 'usa el del producto'", () => {
    const r = parseVariantForm({ sku: "CAM-L", name: "L" }, "CRC");
    expect(r.ok && [r.data.price, r.data.cost]).toEqual([null, null]);
  });
  it("errores por campo", () => {
    const r = parseVariantForm({ sku: "", options: "mal", price: "abc", availableStock: "-1" }, "CRC");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["availableStock", "name", "options", "price", "sku"]);
  });
});

describe("formulario de producto: categoría, colección, estado inicial", () => {
  const base = { name: "Camiseta", sku: "CAM-01", price: "12000", currency: "CRC", availableStock: "5" };
  it("al crear solo permite Oculto o Activo", () => {
    expect(parseProductForm({ ...base, status: "ARCHIVED" }).ok).toBe(false);
    expect(parseProductForm({ ...base, status: "ACTIVE" }).ok).toBe(true);
  });
  it("al editar NO toca el estado", () => {
    const r = parseProductForm({ ...base, status: "ARCHIVED" }, "update");
    expect(r.ok && r.data.status).toBeNull();
  });
  it("categoría existente, nueva y valores inválidos", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    const ok = parseProductForm({ ...base, categoryId: id, newCollection: "Verano 2027" });
    expect(ok.ok && [ok.data.categoryId, ok.data.newCategory, ok.data.newCollection]).toEqual([id, null, "Verano 2027"]);
    expect(parseProductForm({ ...base, categoryId: "no-es-uuid" }).ok).toBe(false);
  });
  it("URLs de imágenes al crear", () => {
    const r = parseProductForm({ ...base, imageUrls: "https://cdn.ejemplo.com/a.jpg" });
    expect(r.ok && r.data.imageUrls).toEqual(["https://cdn.ejemplo.com/a.jpg"]);
    expect(parseProductForm({ ...base, imageUrls: "http://x.com/a.jpg" }).ok).toBe(false);
  });
});

describe("auditoría de edición", () => {
  const before: ProductEditableFields = {
    name: "A", slug: "a", sku: "A-1", shortDescription: null, description: null, categoryId: null, collectionId: null,
    isFeatured: false, isNew: false, isLimitedEdition: false, price: 1000, cost: 500, currency: "CRC", lowStockThreshold: 3, availableStock: 5,
  };
  it("lista solo los campos que cambiaron", () => {
    expect(changedProductFields(before, { ...before })).toEqual([]);
    expect(changedProductFields(before, { ...before, name: "B", isFeatured: true, price: 1200 })).toEqual(["name", "isFeatured", "price"]);
  });
});
