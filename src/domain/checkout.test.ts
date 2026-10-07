import { describe, expect, it } from "vitest";
import { computeTotals, pickNationalMethod, toOrderAmounts, type MethodInput, type TaxConfig, type TotalsLineInput } from "./checkout";
import type { Destination, RateCandidate } from "./shipping";
import { divideRounded, isTaxable, lineTax, parsePercentToBps } from "./tax";

const line = (over: Partial<TotalsLineInput> = {}): TotalsLineInput => ({
  lineId: "l1", productId: "p1", variantId: null, categoryId: "c1", sku: "SKU-1", name: "Llavero", quantity: 1, unitPrice: 10_000, status: "ok", ...over,
});
const rate = (over: Partial<RateCandidate> = {}): RateCandidate => ({
  id: "r1", methodId: "m1", countryCode: "CR", stateProvince: null, city: null, postalCode: null, price: 2_500, currency: "CRC",
  minOrderAmount: null, maxOrderAmount: null, freeShippingThreshold: null, ...over,
});
const method = (over: Partial<MethodInput> = {}, rates: RateCandidate[] = [rate()]): MethodInput => ({
  id: "m1", code: "estandar", name: "Envío estándar", description: null, type: "DELIVERY", sortOrder: 0, estimatedDaysMin: null, estimatedDaysMax: null, rates, ...over,
});
const CR: Destination = { country: "CR", province: "San José", city: "Escazú", postalCode: null };
const tax = (over: Partial<NonNullable<TaxConfig>> = {}): TaxConfig => ({
  code: "iva", name: "Impuesto de prueba", rateBps: 1000, included: false, rounding: "HALF_UP", rules: [{ scope: "ALL", categoryId: null, productId: null, treatment: "TAXABLE" }], ...over,
});
const calc = (over: Partial<Parameters<typeof computeTotals>[0]> = {}) =>
  computeTotals({ currency: "CRC", lines: [line()], tax: null, destination: CR, methods: [method()], selectedMethodId: "m1", ...over });

describe("redondeo", () => {
  it("modos", () => {
    expect(divideRounded(5, 2, "HALF_UP")).toBe(3);
    expect(divideRounded(5, 2, "FLOOR")).toBe(2);
    expect(divideRounded(5, 2, "CEIL")).toBe(3);
    expect(divideRounded(4, 2, "CEIL")).toBe(2);
    expect(divideRounded(7, 3, "HALF_UP")).toBe(2);
  });
  it("impuesto sumado a una línea con decimales", () => {
    expect(lineTax(1_005, 1000, false, "HALF_UP")).toBe(101); // 100,5 → 101
    expect(lineTax(1_005, 1000, false, "FLOOR")).toBe(100);
    expect(lineTax(1_001, 1000, false, "CEIL")).toBe(101);
  });
  it("impuesto incluido: neto + impuesto = precio, siempre", () => {
    for (const price of [1, 99, 1_000, 11_300, 12_345, 99_999]) for (const bps of [100, 1300, 1999]) for (const mode of ["HALF_UP", "FLOOR", "CEIL"] as const) {
      const t = lineTax(price, bps, true, mode);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(price);
    }
    expect(lineTax(11_300, 1300, true, "HALF_UP")).toBe(1_300);
  });
  it("sin tasa o sin monto no hay impuesto", () => {
    expect(lineTax(0, 1300, false, "HALF_UP")).toBe(0);
    expect(lineTax(1000, 0, false, "HALF_UP")).toBe(0);
  });
  it("porcentajes escritos por una persona", () => {
    expect(parsePercentToBps("13")).toEqual({ ok: true, bps: 1300 });
    expect(parsePercentToBps("13,5 %")).toEqual({ ok: true, bps: 1350 });
    expect(parsePercentToBps("0")).toEqual({ ok: true, bps: 0 });
    for (const bad of ["", "abc", "-1", "101", "13.555", "1e2"]) expect(parsePercentToBps(bad).ok).toBe(false);
  });
});

describe("a qué productos aplica el impuesto", () => {
  const all = { scope: "ALL", categoryId: null, productId: null, treatment: "TAXABLE" } as const;
  const p = { productId: "p1", categoryId: "c1" };
  it("sin reglas no se cobra", () => expect(isTaxable(p, [])).toBe(false));
  it("regla general", () => expect(isTaxable(p, [all])).toBe(true));
  it("categoría exenta gana sobre 'todos'", () => expect(isTaxable(p, [all, { scope: "CATEGORY", categoryId: "c1", productId: null, treatment: "EXEMPT" }])).toBe(false));
  it("producto sujeto gana sobre categoría exenta", () =>
    expect(isTaxable(p, [{ scope: "CATEGORY", categoryId: "c1", productId: null, treatment: "EXEMPT" }, { scope: "PRODUCT", categoryId: null, productId: "p1", treatment: "TAXABLE" }])).toBe(true));
  it("regla de otro producto no afecta", () => expect(isTaxable(p, [all, { scope: "PRODUCT", categoryId: null, productId: "p2", treatment: "EXEMPT" }])).toBe(true));
});

describe("carrito sin productos y líneas con problemas", () => {
  it("carrito vacío: bloqueado y sin totales inventados", () => {
    const t = calc({ lines: [] });
    expect(t.subtotal).toBe(0);
    expect(t.total).toBeNull();
    expect(t.canProceed).toBe(false);
    expect(t.blockers[0].code).toBe("empty_cart");
    expect(t.snapshot).toBeNull();
  });
  it("producto oculto/archivado (no disponible) bloquea y no suma", () => {
    const t = calc({ lines: [line(), line({ lineId: "l2", productId: "p2", status: "unavailable", name: "Oculto", unitPrice: 99_999 })] });
    expect(t.subtotal).toBe(10_000);
    expect(t.blockers.map((b) => b.code)).toEqual(["line_unavailable"]);
    expect(t.canProceed).toBe(false);
    expect(t.total).toBeNull();
  });
  it("stock insuficiente bloquea", () => {
    const t = calc({ lines: [line({ status: "insufficient" })] });
    expect(t.blockers[0].code).toBe("line_insufficient");
    expect(t.canProceed).toBe(false);
  });
});

describe("subtotal", () => {
  it("un producto", () => expect(calc().subtotal).toBe(10_000));
  it("varios productos con cantidades distintas", () => {
    const t = calc({ lines: [line({ quantity: 2 }), line({ lineId: "l2", productId: "p2", unitPrice: 3_500, quantity: 3 }), line({ lineId: "l3", productId: "p3", unitPrice: 750, quantity: 1 })] });
    expect(t.subtotal).toBe(20_000 + 10_500 + 750);
    expect(t.lines.map((l) => l.lineTotal)).toEqual([20_000, 10_500, 750]);
  });
});

describe("impuestos", () => {
  it("sin impuesto configurado NO se inventa ninguno", () => {
    const t = calc({ tax: null });
    expect(t.tax).toEqual({ applied: false, name: null, rateBps: null, amount: 0, included: false });
    expect(t.total).toBe(12_500);
  });
  it("impuesto sumado (10 % de 10.000 = 1.000)", () => {
    const t = calc({ tax: tax() });
    expect(t.tax.amount).toBe(1_000);
    expect(t.total).toBe(10_000 + 1_000 + 2_500);
  });
  it("impuesto incluido: el total NO suma el impuesto otra vez", () => {
    const t = calc({ tax: tax({ rateBps: 1300, included: true }), lines: [line({ unitPrice: 11_300 })] });
    expect(t.tax.amount).toBe(1_300);
    expect(t.subtotal).toBe(11_300);
    expect(t.total).toBe(11_300 + 2_500);
  });
  it("producto exento no paga y el resto sí", () => {
    const t = calc({
      tax: tax({ rules: [{ scope: "ALL", categoryId: null, productId: null, treatment: "TAXABLE" }, { scope: "PRODUCT", categoryId: null, productId: "p2", treatment: "EXEMPT" }] }),
      lines: [line(), line({ lineId: "l2", productId: "p2", unitPrice: 5_000 })],
    });
    expect(t.lines.map((l) => [l.taxable, l.taxAmount])).toEqual([[true, 1_000], [false, 0]]);
    expect(t.tax.amount).toBe(1_000);
  });
  it("cambio de tasa: el mismo carrito da otro impuesto (y un snapshot anterior no cambia)", () => {
    const before = calc({ tax: tax({ rateBps: 1000 }) });
    const after = calc({ tax: tax({ rateBps: 1300 }) });
    expect(before.tax.amount).toBe(1_000);
    expect(after.tax.amount).toBe(1_300);
    expect(before.snapshot?.tax.rateBps).toBe(1000);
  });
  it("redondea por línea (no sobre el total)", () => {
    const t = calc({ tax: tax({ rateBps: 1300 }), lines: [line({ unitPrice: 105 }), line({ lineId: "l2", productId: "p2", unitPrice: 105 })] });
    expect(t.tax.amount).toBe(14 + 14); // 13,65 → 14 cada una (no 27)
  });
});

describe("envío (solo Costa Rica, un único 'Envío nacional')", () => {
  it("sin provincia: no se muestra un valor inventado, pero sí el método (nombre y descripción)", () => {
    const t = calc({ destination: null, selectedMethodId: null });
    expect(t.shipping.state).toBe("needs_destination");
    expect(t.shipping.amount).toBeNull();
    expect(t.shipping.method?.name).toBe("Envío estándar");
    expect(t.total).toBeNull();
    expect(t.totalBeforeShipping).toBe(10_000);
  });
  it("con provincia, el único método se aplica solo (la clienta no elige couriers)", () => {
    const t = calc({ selectedMethodId: null });
    expect(t.shipping.state).toBe("selected");
    expect(t.shipping.options).toHaveLength(1);
    expect(t.total).toBe(12_500);
    expect(t.canProceed).toBe(true);
    expect(t.snapshot?.shipping).toMatchObject({ methodId: "m1", amount: 2_500, freeApplied: false });
  });
  it("el BACKEND rechaza cualquier país distinto de Costa Rica (aunque la pantalla no lo permita)", () => {
    for (const country of ["US", "MX", "ES", "cr-x"]) {
      const t = calc({ destination: { country, province: "San José", city: null, postalCode: null } });
      expect(t.shipping.state).toBe("unsupported_country");
      expect(t.shipping.options).toHaveLength(0);
      expect(t.total).toBeNull();
      expect(t.snapshot).toBeNull();
      expect(t.canProceed).toBe(false);
    }
    expect(calc({ destination: { ...CR, country: "cr" } }).shipping.state).toBe("selected");
  });
  it("un método pedido por el navegador que no es el nacional se rechaza", () => {
    const t = calc({ selectedMethodId: "no-existe" });
    expect(t.shipping.selectionInvalid).toBe(true);
    expect(t.total).toBeNull();
    expect(t.canProceed).toBe(false);
  });
  it("sin tarifa configurada para el destino: 'no configurado' (no 'no disponible'), y el método sigue visible", () => {
    const t = calc({ methods: [method({}, [rate({ stateProvince: "Limón" })])] });
    expect(t.shipping.state).toBe("not_configured");
    expect(t.shipping.method?.name).toBe("Envío estándar");
    expect(t.total).toBeNull();
  });
  it("método sin ninguna tarifa (recién creado): no configurado", () => expect(calc({ methods: [method({}, [])] }).shipping.state).toBe("not_configured"));
  it("sin ningún método activo: no hay método y no hay envío configurado", () => {
    const t = calc({ methods: [] });
    expect(t.shipping.method).toBeNull();
    expect(t.shipping.state).toBe("not_configured");
    expect(t.total).toBeNull();
  });
  it("aunque haya varios métodos, solo se ofrece UNO: el primero de entrega a domicilio por prioridad; el retiro no se ofrece", () => {
    const pickup = method({ id: "m2", code: "retiro", name: "Retiro", type: "PICKUP", sortOrder: -5 }, [rate({ id: "r2", methodId: "m2", price: 0 })]);
    const second = method({ id: "m3", code: "otro", name: "Otro envío", sortOrder: 5 }, [rate({ id: "r3", methodId: "m3", price: 1 })]);
    const t = calc({ methods: [second, pickup, method()], selectedMethodId: null });
    expect(t.shipping.options.map((o) => o.code)).toEqual(["estandar"]);
    expect(t.total).toBe(12_500);
  });
  it("envío gratis al llegar al umbral configurado", () => {
    const m = method({}, [rate({ freeShippingThreshold: 10_000 })]);
    expect(calc({ methods: [m] }).shipping.selected).toMatchObject({ amount: 0, free: true });
    expect(calc({ methods: [m], lines: [line({ unitPrice: 9_999 })] }).shipping.selected).toMatchObject({ amount: 2_500, free: false });
    expect(calc({ methods: [m] }).total).toBe(10_000);
  });
  it("rango de monto de pedido (mínimo y máximo)", () => {
    expect(calc({ methods: [method({}, [rate({ minOrderAmount: 20_000 })])] }).shipping.state).toBe("not_configured");
    expect(calc({ methods: [method({}, [rate({ maxOrderAmount: 5_000 })])] }).shipping.state).toBe("not_configured");
  });
  it("la tarifa más específica gana: cantón > provincia > todo el país", () => {
    const m = method({}, [rate({ id: "pais", price: 3_000 }), rate({ id: "sj", stateProvince: "San José", price: 1_500 }), rate({ id: "esc", stateProvince: "San José", city: "Escazú", price: 900 })]);
    expect(calc({ methods: [m] }).shipping.selected?.amount).toBe(900);
    expect(calc({ methods: [m], destination: { ...CR, city: "Desamparados" } }).shipping.selected?.amount).toBe(1_500);
    expect(calc({ methods: [m], destination: { ...CR, province: "Limón", city: null } }).shipping.selected?.amount).toBe(3_000);
  });
  it("zonas como Limón / GAM / resto del país: cada una con su propia tarifa configurable", () => {
    const m = method({}, [
      rate({ id: "limon", stateProvince: "Limón", price: 4_000 }),
      rate({ id: "gam", stateProvince: "San José; Heredia", city: "Escazú; Santa Ana; Heredia", price: 2_000 }),
      rate({ id: "resto", price: 6_000 }),
    ]);
    const at = (province: string, city: string | null) => calc({ methods: [m], destination: { country: "CR", province, city, postalCode: null } }).shipping.selected?.amount;
    expect(at("Limón", "Pococí")).toBe(4_000);
    expect(at("San José", "Escazú")).toBe(2_000);
    expect(at("Heredia", "heredia")).toBe(2_000);
    expect(at("San José", "Pérez Zeledón")).toBe(6_000); // fuera de la lista de cantones → resto del país
    expect(at("Guanacaste", null)).toBe(6_000);
  });
  it("las zonas ignoran mayúsculas y tildes", () => {
    const m = method({}, [rate({ stateProvince: "san jose", price: 1_500 })]);
    expect(calc({ methods: [m] }).shipping.selected?.amount).toBe(1_500);
  });
  it("una tarifa en otra moneda no se usa (no hay conversión)", () => expect(calc({ methods: [method({}, [rate({ currency: "USD" })])] }).shipping.state).toBe("not_configured"));
  it("cambio de tarifa: otro costo (y un snapshot anterior no cambia)", () => {
    const before = calc();
    const after = calc({ methods: [method({}, [rate({ price: 4_000 })])] });
    expect(before.snapshot?.shipping.amount).toBe(2_500);
    expect(after.total).toBe(14_000);
  });
  it("pickNationalMethod: solo entrega a domicilio; sin ninguna, no hay método", () => {
    expect(pickNationalMethod([])).toBeNull();
    expect(pickNationalMethod([method({ type: "PICKUP" })])).toBeNull();
    expect(pickNationalMethod([method({ id: "b", name: "B", sortOrder: 2 }), method({ id: "a", name: "A", sortOrder: 1 })])?.id).toBe("a");
  });
  it("Total = subtotal + impuesto + envío", () => {
    const t = calc({ tax: tax({ rateBps: 1300 }) });
    expect(t.total).toBe(t.subtotal + t.tax.amount + (t.shipping.amount ?? 0));
  });
});

describe("snapshot y montos de la orden", () => {
  it("el snapshot congela moneda, tasa, método, destino y total", () => {
    const t = calc({ tax: tax({ rateBps: 1300 }), now: new Date("2026-10-07T12:00:00Z") });
    expect(t.snapshot).toMatchObject({ version: 1, currency: "CRC", subtotal: 10_000, total: 10_000 + 1_300 + 2_500, computedAt: "2026-10-07T12:00:00.000Z" });
    expect(t.snapshot?.tax).toMatchObject({ rateBps: 1300, included: false, amount: 1_300, rounding: "HALF_UP" });
    expect(t.snapshot?.shipping.destination).toEqual(CR);
  });
  it("toOrderAmounts cumple SIEMPRE total = subtotal + envío + impuesto (el CHECK de la tabla orders)", () => {
    for (const included of [false, true]) for (const bps of [0, 800, 1300]) for (const price of [999, 10_000, 12_345]) for (const qty of [1, 3]) {
      const t = calc({ tax: tax({ rateBps: bps, included }), lines: [line({ unitPrice: price, quantity: qty })] });
      const o = toOrderAmounts(t.snapshot!);
      expect(o.subtotal + o.shippingTotal + o.taxTotal).toBe(o.total);
      expect(o.subtotal).toBeGreaterThanOrEqual(0);
    }
  });
  it("con impuesto incluido el subtotal de la orden es NETO", () => {
    const o = toOrderAmounts(calc({ tax: tax({ rateBps: 1300, included: true }), lines: [line({ unitPrice: 11_300 })] }).snapshot!);
    expect(o).toEqual({ subtotal: 10_000, taxTotal: 1_300, shippingTotal: 2_500, total: 13_800 });
  });
});
