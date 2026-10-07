import { describe, expect, it } from "vitest";
import { parseShippingMethodForm, parseShippingRateForm, parseTaxRateForm, parseTaxRuleForm } from "./settings-form";
import { parseDestination } from "./shipping";

describe("formulario de impuesto", () => {
  const ok = { name: "Impuesto", rate: "13", included: "yes", rounding: "HALF_UP", active: "on" };
  it("válido", () => expect(parseTaxRateForm(ok)).toEqual({ ok: true, data: { name: "Impuesto", rateBps: 1300, included: true, rounding: "HALF_UP", active: true } }));
  it("sin elegir si el precio incluye impuesto NO hay valor por defecto", () => expect(parseTaxRateForm({ ...ok, included: "" }).ok).toBe(false));
  it("tasa inválida o fuera de rango", () => {
    for (const rate of ["", "abc", "101", "-3"]) expect(parseTaxRateForm({ ...ok, rate }).ok).toBe(false);
  });
  it("0 % es válido (impuesto configurado pero sin cobro)", () => expect(parseTaxRateForm({ ...ok, rate: "0" }).ok).toBe(true));
  it("inactivo por defecto si no se marca", () => expect(parseTaxRateForm({ ...ok, active: undefined }).ok && parseTaxRateForm({ ...ok, active: undefined })).toMatchObject({ data: { active: false } }));
});

describe("reglas de impuesto", () => {
  it("todos", () => expect(parseTaxRuleForm({ scope: "ALL", treatment: "TAXABLE" })).toMatchObject({ ok: true, data: { scope: "ALL", categoryId: null, sku: null } }));
  it("categoría exige una categoría válida", () => {
    expect(parseTaxRuleForm({ scope: "CATEGORY", treatment: "EXEMPT", categoryId: "no" }).ok).toBe(false);
    expect(parseTaxRuleForm({ scope: "CATEGORY", treatment: "EXEMPT", categoryId: "11111111-1111-1111-1111-111111111111" }).ok).toBe(true);
  });
  it("producto exige SKU", () => {
    expect(parseTaxRuleForm({ scope: "PRODUCT", treatment: "EXEMPT", sku: "" }).ok).toBe(false);
    expect(parseTaxRuleForm({ scope: "PRODUCT", treatment: "EXEMPT", sku: "LLA-01" })).toMatchObject({ ok: true, data: { sku: "LLA-01" } });
  });
});

describe("método de envío", () => {
  it("el código sale del nombre si no se escribe", () => expect(parseShippingMethodForm({ name: "Envío estándar", type: "DELIVERY" })).toMatchObject({ ok: true, data: { code: "envio-estandar", sortOrder: 0, active: false } }));
  it("días y prioridad", () => {
    expect(parseShippingMethodForm({ name: "X1", type: "DELIVERY", daysMin: "5", daysMax: "2" }).ok).toBe(false);
    expect(parseShippingMethodForm({ name: "X1", type: "PICKUP", daysMin: "1", daysMax: "3", sortOrder: "-5" })).toMatchObject({ ok: true, data: { estimatedDaysMin: 1, estimatedDaysMax: 3, sortOrder: -5 } });
    expect(parseShippingMethodForm({ name: "X1", type: "NAVE" }).ok).toBe(false);
  });
});

describe("tarifa de envío", () => {
  it("zona, montos y país fijo (Costa Rica)", () => {
    const r = parseShippingRateForm({ zoneName: "Limón", province: "Limón", price: "2.500", minOrder: "10000", freeThreshold: "50000", active: "on" });
    expect(r).toMatchObject({ ok: true, data: { countryCode: "CR", zoneName: "Limón", stateProvince: "Limón", price: 2500, minOrderAmount: 10000, freeShippingThreshold: 50000, active: true } });
  });
  it("el país NO sale del formulario: aunque alguien mande otro, queda Costa Rica", () => {
    expect(parseShippingRateForm({ country: "US", price: "100" })).toMatchObject({ ok: true, data: { countryCode: "CR" } });
  });
  it("una zona puede listar varias provincias o cantones separados por ';'", () => {
    const r = parseShippingRateForm({ zoneName: "GAM", province: "San José; Heredia", city: "Escazú; Santa Ana ;Curridabat", price: "100" });
    expect(r).toMatchObject({ ok: true, data: { zoneName: "GAM", stateProvince: "San José; Heredia", city: "Escazú; Santa Ana ;Curridabat" } });
  });
  it("sin zona = todo el país", () => expect(parseShippingRateForm({ price: "20000" })).toMatchObject({ ok: true, data: { stateProvince: null, city: null, postalCode: null, zoneName: null } }));
  it("errores", () => {
    expect(parseShippingRateForm({ price: "" }).ok).toBe(false);
    expect(parseShippingRateForm({ price: "-5" }).ok).toBe(false);
    expect(parseShippingRateForm({ price: "5", minOrder: "100", maxOrder: "50" }).ok).toBe(false);
  });
});

describe("destino que llega por la URL (no confiable): solo Costa Rica", () => {
  it("normaliza la provincia al nombre oficial y limpia la ciudad", () =>
    expect(parseDestination({ provincia: "  san jose ", ciudad: "Escazú" })).toEqual({ destination: { country: "CR", province: "San José", city: "Escazú", postalCode: null }, countryRejected: false }));
  it("pais=CR (o cr) es válido", () => {
    expect(parseDestination({ pais: "CR", provincia: "Limón" }).destination?.country).toBe("CR");
    expect(parseDestination({ pais: "cr", provincia: "limon" }).destination?.province).toBe("Limón");
  });
  it("cualquier otro país se RECHAZA (request manipulada)", () => {
    for (const pais of ["US", "MX", "ZZ", "CRX", "1", "--", "Costa Rica"]) expect(parseDestination({ pais, provincia: "San José" })).toEqual({ destination: null, countryRejected: true });
  });
  it("provincia ausente o que no existe en Costa Rica → todavía no hay destino", () => {
    for (const provincia of [undefined, "", "Texas", "Cundinamarca"]) expect(parseDestination({ provincia })).toEqual({ destination: null, countryRejected: false });
  });
  it("recorta y limpia caracteres de control", () => expect(parseDestination({ provincia: "Limón", ciudad: "a\u0000b" + "x".repeat(200) }).destination?.city?.length).toBeLessThanOrEqual(80));
});
