import { describe, expect, it } from "vitest";
import { computeTotals, toOrderAmounts, type MethodInput, type TaxConfig, type TotalsLineInput } from "./checkout";
import { parseCatalogSelection, shopHref } from "./catalog-filters";
import { DIGITAL_FILE, DOWNLOAD_LINK_RULES, digitalStorageKey, fulfillmentMix, looksLikePdf, safeDownloadName } from "./fulfillment";
import { parseProductForm } from "./product-form";
import type { Destination, RateCandidate } from "./shipping";

/** Carritos físico, digital y mixto: envío, impuestos, total y lo que se guarda en el pedido (y se manda a Tilopay: `orders.total`). */
const line = (over: Partial<TotalsLineInput> = {}): TotalsLineInput => ({
  lineId: "l1", productId: "p1", variantId: null, categoryId: "c1", sku: "SKU-1", name: "Llavero", quantity: 1, unitPrice: 10_000, status: "ok", fulfillment: "PHYSICAL", ...over,
});
const book = (over: Partial<TotalsLineInput> = {}) => line({ lineId: "l2", productId: "p2", sku: "LIB-1", name: "Libro digital", unitPrice: 6_000, fulfillment: "DIGITAL", ...over });
const rate = (over: Partial<RateCandidate> = {}): RateCandidate => ({
  id: "r1", methodId: "m1", countryCode: "CR", stateProvince: null, city: null, postalCode: null, price: 2_500, currency: "CRC",
  minOrderAmount: null, maxOrderAmount: null, freeShippingThreshold: null, ...over,
});
const method = (rates: RateCandidate[] = [rate()]): MethodInput => ({
  id: "m1", code: "nacional", name: "Envío nacional", description: null, type: "DELIVERY", sortOrder: 0, estimatedDaysMin: null, estimatedDaysMax: null, rates,
});
const CR: Destination = { country: "CR", province: "San José", city: "Escazú", postalCode: "10201" };
const tax = (over: Partial<NonNullable<TaxConfig>> = {}): TaxConfig => ({
  code: "iva", name: "IVA", rateBps: 1300, included: false, rounding: "HALF_UP", rules: [{ scope: "ALL", categoryId: null, productId: null, treatment: "TAXABLE" }], ...over,
});
const calc = (over: Partial<Parameters<typeof computeTotals>[0]> = {}) =>
  computeTotals({ currency: "CRC", lines: [line()], tax: null, destination: CR, methods: [method()], ...over });

describe("carrito solo FÍSICO", () => {
  it("cobra el envío de la tarifa y el total suma todo", () => {
    const t = calc();
    expect(t.shipping.required).toBe(true);
    expect(t.shipping.state).toBe("selected");
    expect(t.shipping.amount).toBe(2_500);
    expect(t.total).toBe(12_500);
    expect(t.snapshot?.shipping.required).toBe(true);
    expect(t.snapshot?.shipping.methodId).toBe("m1");
  });
  it("sin destino pide la provincia y no inventa un total", () => {
    const t = calc({ destination: null });
    expect(t.shipping.state).toBe("needs_destination");
    expect(t.total).toBeNull();
  });
  it("una línea sin `fulfillment` (datos anteriores) se trata como física", () => {
    const { fulfillment: _unused, ...legacy } = line();
    void _unused;
    expect(calc({ lines: [legacy] }).shipping.amount).toBe(2_500);
  });
});

describe("carrito solo DIGITAL", () => {
  it("envío ₡0, sin método ni tarifa, y se puede pagar SIN dirección de entrega", () => {
    const t = calc({ lines: [book()], destination: null });
    expect(t.shipping.required).toBe(false);
    expect(t.shipping.state).toBe("not_required");
    expect(t.shipping.amount).toBe(0);
    expect(t.total).toBe(6_000);
    expect(t.canProceed).toBe(true);
    expect(t.snapshot?.shipping).toMatchObject({ required: false, methodId: null, rateId: null, amount: 0, type: null });
  });
  it("aunque no haya NINGÚN método de envío configurado, un libro digital se puede comprar", () => {
    const t = calc({ lines: [book()], methods: [] });
    expect(t.canProceed).toBe(true);
    expect(t.total).toBe(6_000);
  });
  it("ignora el destino y un método pedido por el navegador", () => {
    const t = calc({ lines: [book()], selectedMethodId: "otro" });
    expect(t.total).toBe(6_000);
    expect(t.shipping.options).toEqual([]);
  });
  it("con impuesto sumado: total = subtotal + impuesto, sin envío", () => {
    const t = calc({ lines: [book()], tax: tax() });
    expect(t.total).toBe(6_000 + 780);
    const amounts = toOrderAmounts(t.snapshot!);
    expect(amounts).toEqual({ subtotal: 6_000, taxTotal: 780, shippingTotal: 0, total: 6_780 });
    expect(amounts.subtotal + amounts.taxTotal + amounts.shippingTotal).toBe(amounts.total); // check orders_total_matches_parts
  });
  it("con impuesto incluido: el subtotal se guarda neto y la suma sigue dando lo que paga la clienta", () => {
    const t = calc({ lines: [book({ unitPrice: 11_300 })], tax: tax({ included: true }) });
    const amounts = toOrderAmounts(t.snapshot!);
    expect(t.total).toBe(11_300);
    expect(amounts.subtotal + amounts.taxTotal + amounts.shippingTotal).toBe(11_300);
  });
});

describe("carrito MIXTO", () => {
  it("el envío se calcula SOLO con lo físico", () => {
    const t = calc({ lines: [line(), book()], methods: [method([rate({ freeShippingThreshold: 12_000 })])] });
    // subtotal total 16.000 ≥ 12.000, pero lo físico son 10.000 → NO llega al umbral: se cobra el envío
    expect(t.subtotal).toBe(16_000);
    expect(t.shipping.amount).toBe(2_500);
    expect(t.total).toBe(18_500);
    expect(t.snapshot?.shipping).toMatchObject({ required: true, physicalSubtotal: 10_000, amount: 2_500 });
  });
  it("si lo físico llega al umbral, el envío es gratis", () => {
    const t = calc({ lines: [line({ unitPrice: 13_000 }), book()], methods: [method([rate({ freeShippingThreshold: 12_000 })])] });
    expect(t.shipping.amount).toBe(0);
    expect(t.shipping.selected?.free).toBe(true);
    expect(t.total).toBe(19_000);
  });
  it("las tarifas por monto mínimo/máximo usan el subtotal físico", () => {
    const rates = [rate({ id: "chico", price: 1_000, maxOrderAmount: 12_000 }), rate({ id: "grande", price: 4_000, minOrderAmount: 12_001 })];
    const t = calc({ lines: [line(), book({ unitPrice: 50_000 })], methods: [method(rates)] });
    expect(t.shipping.selected?.rateId).toBe("chico");
    expect(t.shipping.amount).toBe(1_000);
  });
  it("sigue exigiendo destino y tarifa para la parte física", () => {
    expect(calc({ lines: [line(), book()], destination: null }).total).toBeNull();
    expect(calc({ lines: [line(), book()], methods: [] }).canProceed).toBe(false);
  });
  it("el impuesto sí aplica a todas las líneas y el total cuadra con las partes guardadas", () => {
    const t = calc({ lines: [line(), book()], tax: tax() });
    const a = toOrderAmounts(t.snapshot!);
    expect(t.tax.amount).toBe(1_300 + 780);
    expect(a.subtotal + a.taxTotal + a.shippingTotal).toBe(a.total);
    expect(a.total).toBe(t.total);
  });
  it("una línea digital sin stock/inválida bloquea igual que una física", () => {
    const t = calc({ lines: [line(), book({ status: "unavailable" })] });
    expect(t.canProceed).toBe(false);
    expect(t.blockers[0]?.code).toBe("line_unavailable");
  });
});

describe("tipo de producto y entrega", () => {
  it("clasifica el carrito", () => {
    expect(fulfillmentMix([])).toBe("empty");
    expect(fulfillmentMix(["DIGITAL", "DIGITAL"])).toBe("digital_only");
    expect(fulfillmentMix(["PHYSICAL"])).toBe("physical_only");
    expect(fulfillmentMix(["PHYSICAL", "DIGITAL"])).toBe("mixed");
  });
  it("solo es PDF si el CONTENIDO empieza con %PDF-", () => {
    expect(looksLikePdf(new TextEncoder().encode("%PDF-1.7\n..."))).toBe(true);
    expect(looksLikePdf(new TextEncoder().encode("<html>%PDF-"))).toBe(false);
    expect(looksLikePdf(new Uint8Array([0x25, 0x50]))).toBe(false);
    expect(looksLikePdf(new Uint8Array())).toBe(false);
  });
  it("nombre de descarga seguro", () => {
    expect(safeDownloadName("Entre ciencia, mar y canciones")).toBe("Entre ciencia mar y canciones.pdf");
    expect(safeDownloadName('../../etc/passwd"; x=')).toBe("etcpasswd x.pdf");
    expect(safeDownloadName("Poesía del Caribe.pdf")).toBe("Poesia del Caribe.pdf");
    expect(safeDownloadName("###")).toBe("libro.pdf");
  });
  it("la clave de almacenamiento no incluye el nombre del archivo", () => {
    expect(digitalStorageKey("p-1", "u-1")).toBe(`${DIGITAL_FILE.keyPrefix}/p-1/u-1.pdf`);
  });
  it("los enlaces son temporales y con tope", () => {
    for (const rule of Object.values(DOWNLOAD_LINK_RULES)) {
      expect(rule.ttlMinutes).toBeGreaterThan(0);
      expect(rule.maxDownloads).toBeGreaterThan(0);
    }
    expect(DOWNLOAD_LINK_RULES.PAGE.ttlMinutes).toBeLessThan(DOWNLOAD_LINK_RULES.EMAIL.ttlMinutes);
  });
});

describe("formulario de producto: tipo y colecciones", () => {
  const base = { name: "Libro", sku: "LIB-1", price: "6000", currency: "CRC" };
  const A = "11111111-1111-4111-8111-111111111111";
  const B = "22222222-2222-4222-8222-222222222222";
  it("el tipo es explícito; por defecto físico", () => {
    expect(parseProductForm(base)).toMatchObject({ ok: true, data: { productType: "PHYSICAL" } });
    expect(parseProductForm({ ...base, productType: "DIGITAL" })).toMatchObject({ ok: true, data: { productType: "DIGITAL" } });
    const bad = parseProductForm({ ...base, productType: "LIBRO" });
    expect(bad.ok).toBe(false);
  });
  it("varias colecciones sin repetir; ids inválidos se rechazan", () => {
    const ok = parseProductForm({ ...base, collectionIds: `${A},${B},${A}` });
    expect(ok.ok && ok.data.collectionIds).toEqual([A, B]);
    expect(parseProductForm({ ...base, collectionIds: "no-es-uuid" }).ok).toBe(false);
  });
});

describe("filtros del catálogo", () => {
  it("solo acepta slugs bien formados", () => {
    expect(parseCatalogSelection({ categoria: "libros", coleccion: "verano-2026" })).toEqual({ category: "libros", collection: "verano-2026" });
    expect(parseCatalogSelection({ categoria: "x'; drop table", coleccion: ["a", "b"] })).toEqual({ category: null, collection: "a" });
    expect(parseCatalogSelection({})).toEqual({ category: null, collection: null });
  });
  it("arma enlaces que se combinan y se limpian", () => {
    expect(shopHref({ category: "libros", collection: "verano" })).toBe("/shop?categoria=libros&coleccion=verano");
    expect(shopHref({ category: null, collection: "verano" })).toBe("/shop?coleccion=verano");
    expect(shopHref({})).toBe("/shop");
    expect(shopHref({ category: "libros" }, "/shop/colecciones/verano")).toBe("/shop/colecciones/verano?categoria=libros");
  });
});
