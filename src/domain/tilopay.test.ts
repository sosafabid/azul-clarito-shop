import { describe, expect, it } from "vitest";
import {
  amountToCents,
  buildProcessPaymentBody,
  crStateCode,
  evaluateConsult,
  formatProviderAmount,
  isTilopayPaymentUrl,
  parseConsultResponse,
  parseProcessPaymentResponse,
  providerOrderNumber,
  type ConsultItem,
} from "./tilopay";

const item = (over: Partial<ConsultItem> = {}): ConsultItem => ({ providerId: "734312", orderNumber: "AC-2026-000001", amount: "12000.00", currency: "CRC", code: "1", message: "Transacción aprobada", environment: "Test", kind: "Payment", date: "2026-10-08 10:00:00", ...over });
const expected = { orderNumber: "AC-2026-000001", amountMinor: 12000, currency: "CRC" as const };

describe("montos y números de orden", () => {
  it("el monto va como texto con 2 decimales, tomado del total guardado", () => {
    expect(formatProviderAmount(12000, "CRC")).toBe("12000.00");
    expect(formatProviderAmount(1250, "USD")).toBe("12.50");
  });
  it("el intento 1 usa el número del pedido y los siguientes un sufijo (el orderNumber no se reutiliza)", () => {
    expect(providerOrderNumber("AC-2026-000001", 1)).toBe("AC-2026-000001");
    expect(providerOrderNumber("AC-2026-000001", 3)).toBe("AC-2026-000001-3");
    expect(() => providerOrderNumber("AC", 0)).toThrow();
  });
  it("amountToCents solo acepta decimales simples", () => {
    expect(amountToCents("12000.00")).toBe(1200000);
    expect(amountToCents("5")).toBe(500);
    expect(amountToCents("1e3")).toBeNull();
    expect(amountToCents("-5")).toBeNull();
    expect(amountToCents("")).toBeNull();
  });
});

describe("cuerpo de processPayment", () => {
  const body = buildProcessPaymentBody({
    key: "KEY",
    redirectUrl: "https://shop.example/api/payments/tilopay/return",
    returnData: "abc123",
    orderNumber: "AC-2026-000001",
    amountMinor: 12000,
    currency: "CRC",
    customer: { firstName: "Ana", lastName: "Soto", email: "ana@example.com", phone: "88887777" },
    address: { line1: "Calle 1", line2: "Casa azul", city: "Limón", stateCode: "CR-L", postalCode: "70101", countryCode: "CR" },
  });
  it("incluye los campos requeridos de la documentación, todos como texto", () => {
    for (const field of ["redirect", "key", "amount", "currency", "orderNumber", "capture", "billToFirstName", "billToLastName", "billToAddress", "billToAddress2", "billToCity", "billToState", "billToZipPostCode", "billToCountry", "billToTelephone", "billToEmail", "shipToFirstName", "shipToLastName", "shipToAddress", "shipToAddress2", "shipToCity", "shipToState", "shipToZipPostCode", "shipToCountry", "shipToTelephone", "subscription", "platform"]) {
      expect(typeof body[field], field).toBe("string");
    }
    expect(body.amount).toBe("12000.00");
    expect(body.capture).toBe("1");
    expect(body.subscription).toBe("0");
    expect(body.billToState).toBe("CR-L");
  });
  it("no envía campos opcionales cuyo efecto no se verificó (hashVersion, token_version)", () => {
    expect(body).not.toHaveProperty("hashVersion");
    expect(body).not.toHaveProperty("token_version");
  });
  it("jamás lleva datos de tarjeta", () => {
    expect(Object.keys(body).join(",")).not.toMatch(/card|cvv|cvc|expir/i);
  });
});

describe("provincias y URL de pago", () => {
  it("códigos ISO de Costa Rica", () => {
    expect(crStateCode("San José")).toBe("CR-SJ");
    expect(crStateCode("limon")).toBe("CR-L");
    expect(crStateCode("Panamá")).toBeNull();
  });
  it("solo se acepta una URL https de tilopay.com", () => {
    expect(isTilopayPaymentUrl("https://secure.tilopay.com/htmls/1212122_574572148file.html")).toBe(true);
    expect(isTilopayPaymentUrl("http://secure.tilopay.com/x")).toBe(false);
    expect(isTilopayPaymentUrl("https://evil.example/tilopay.com")).toBe(false);
    expect(isTilopayPaymentUrl("https://tilopay.com.evil.example/x")).toBe(false);
    expect(isTilopayPaymentUrl("https://user:pw@secure.tilopay.com/x")).toBe(false);
    expect(isTilopayPaymentUrl("javascript:alert(1)")).toBe(false);
    expect(isTilopayPaymentUrl(undefined)).toBe(false);
  });
  it("parseProcessPaymentResponse exige una url válida", () => {
    expect(parseProcessPaymentResponse({ type: "100", html: "Use url redirect", url: "https://secure.tilopay.com/a.html" })).toEqual({ ok: true, url: "https://secure.tilopay.com/a.html" });
    expect(parseProcessPaymentResponse({ type: "400", message: "x" })).toEqual({ ok: false, reason: "no_url" });
    expect(parseProcessPaymentResponse("html")).toEqual({ ok: false, reason: "invalid_response" });
  });
});

describe("parseConsultResponse", () => {
  it("lee el ejemplo oficial y descarta lo que no tiene forma", () => {
    const parsed = parseConsultResponse({ type: "200", message: "", response: [{ id_tilopay: 734312, orderNumber: "1212122", amount: "5.00", currency: "usd", code: "1", response: "Transacción aprobada", environment: "Test", type: "Payment", date: "2024-07-31 16:59:20" }, null, { foo: 1 }] });
    expect(parsed).toMatchObject({ ok: true });
    if (parsed.ok) {
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0]).toMatchObject({ providerId: "734312", currency: "USD", code: "1", environment: "Test" });
    }
  });
  it("una respuesta sin lista es inválida", () => {
    expect(parseConsultResponse({ type: "404" })).toEqual({ ok: false, reason: "invalid_response" });
    expect(parseConsultResponse(null)).toEqual({ ok: false, reason: "invalid_response" });
  });
});

describe("evaluateConsult — única fuente de verdad del pago", () => {
  it("aprobado: code 1 con el mismo número, monto, moneda y ambiente de pruebas", () => {
    expect(evaluateConsult([item()], expected, "sandbox")).toMatchObject({ kind: "approved", providerId: "734312" });
  });
  it("sin transacciones → not_found (no se asume ni éxito ni fracaso)", () => {
    expect(evaluateConsult([], expected, "sandbox")).toEqual({ kind: "not_found" });
    expect(evaluateConsult([item({ orderNumber: "OTRO" })], expected, "sandbox")).toEqual({ kind: "not_found" });
  });
  it("cualquier code distinto de 1 → rechazado", () => {
    expect(evaluateConsult([item({ code: "2", message: "Fondos insuficientes" })], expected, "sandbox")).toMatchObject({ kind: "rejected", code: "2" });
    expect(evaluateConsult([item({ code: "" })].filter((i) => i.code), expected, "sandbox")).toEqual({ kind: "not_found" });
  });
  it("monto distinto → mismatch (aunque el code sea 1)", () => {
    expect(evaluateConsult([item({ amount: "1.00" })], expected, "sandbox")).toMatchObject({ kind: "mismatch", reasons: ["amount"] });
    expect(evaluateConsult([item({ amount: "12000.01" })], expected, "sandbox")).toMatchObject({ kind: "mismatch" });
    expect(evaluateConsult([item({ amount: "abc" })], expected, "sandbox")).toMatchObject({ kind: "mismatch", reasons: ["amount"] });
  });
  it("moneda distinta → mismatch", () => {
    expect(evaluateConsult([item({ currency: "USD" })], expected, "sandbox")).toMatchObject({ kind: "mismatch", reasons: ["currency"] });
  });
  it("sandbox: una transacción de ambiente real NO se acepta; production: una de prueba tampoco", () => {
    expect(evaluateConsult([item({ environment: "Production" })], expected, "sandbox")).toMatchObject({ kind: "mismatch", reasons: ["environment"] });
    expect(evaluateConsult([item({ environment: "" })], expected, "sandbox")).toMatchObject({ kind: "mismatch" });
    expect(evaluateConsult([item({ environment: "Test" })], expected, "production")).toMatchObject({ kind: "mismatch", reasons: ["environment"] });
    expect(evaluateConsult([item({ environment: "Production" })], expected, "production")).toMatchObject({ kind: "approved" });
  });
  it("acumula varios motivos", () => {
    expect(evaluateConsult([item({ amount: "1.00", currency: "USD", environment: "Production" })], expected, "sandbox")).toMatchObject({ kind: "mismatch", reasons: ["amount", "currency", "environment"] });
  });
  it("con varios intentos con el mismo orderNumber gana la aprobada", () => {
    expect(evaluateConsult([item({ code: "5", providerId: "1" }), item({ providerId: "2" })], expected, "sandbox")).toMatchObject({ kind: "approved", providerId: "2" });
  });
});
