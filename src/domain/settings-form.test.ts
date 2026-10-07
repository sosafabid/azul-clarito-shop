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
  it("país, zona y montos", () => {
    const r = parseShippingRateForm({ country: "cr", province: "San  José", price: "2.500", minOrder: "10000", freeThreshold: "50000", active: "on" });
    expect(r).toMatchObject({ ok: true, data: { countryCode: "CR", stateProvince: "San José", price: 2500, minOrderAmount: 10000, freeShippingThreshold: 50000, active: true } });
  });
  it("'Cualquier país' = null", () => expect(parseShippingRateForm({ country: "", price: "20000" })).toMatchObject({ ok: true, data: { countryCode: null } }));
  it("errores", () => {
    expect(parseShippingRateForm({ country: "ZZ", price: "1" }).ok).toBe(false);
    expect(parseShippingRateForm({ country: "CR", price: "" }).ok).toBe(false);
    expect(parseShippingRateForm({ country: "CR", price: "-5" }).ok).toBe(false);
    expect(parseShippingRateForm({ country: "CR", price: "5", minOrder: "100", maxOrder: "50" }).ok).toBe(false);
  });
});

describe("destino que llega por la URL (no confiable)", () => {
  it("normaliza", () => expect(parseDestination({ pais: "cr", provincia: "  San José ", ciudad: "Escazú" })).toEqual({ country: "CR", province: "San José", city: "Escazú", postalCode: null }));
  it("país inválido → sin destino", () => {
    for (const pais of ["", "ZZ", "CRX", "1", "--"]) expect(parseDestination({ pais })).toBeNull();
    expect(parseDestination({})).toBeNull();
  });
  it("recorta y limpia caracteres de control", () => expect(parseDestination({ pais: "CR", ciudad: "a\u0000b" + "x".repeat(200) })?.city?.length).toBeLessThanOrEqual(80));
});
