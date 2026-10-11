import { describe, expect, it } from "vitest";
import { parseCheckoutForm, splitName } from "./checkout-form";

function form(over: Record<string, string> = {}) {
  const data = new FormData();
  const base: Record<string, string> = { name: "María José Soto Rojas", email: " Maria@Example.COM ", phone: "8888-7777", province: "Limón", city: "Limón", district: "Limón", postalCode: "70101", line1: "100 m norte de la iglesia", line2: "", notes: "", acceptTerms: "on", ...over };
  for (const [k, v] of Object.entries(base)) data.set(k, v);
  return data;
}

describe("parseCheckoutForm", () => {
  it("acepta datos válidos, normaliza el correo y calcula el código de provincia", () => {
    const r = parseCheckoutForm(form());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.email).toBe("maria@example.com");
      expect(r.value.stateCode).toBe("CR-L");
      expect(r.value.firstName).toBe("María José");
      expect(r.value.lastName).toBe("Soto Rojas");
    }
  });
  it("exige código postal de 5 dígitos, teléfono, distrito y aceptar los términos", () => {
    const r = parseCheckoutForm(form({ postalCode: "123", phone: "12", district: "", acceptTerms: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["acceptTerms", "district", "phone", "postalCode"]);
  });
  it("rechaza provincias que no son de Costa Rica (solo se envía dentro del país)", () => {
    const r = parseCheckoutForm(form({ province: "Panamá" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.province).toBeTruthy();
  });
  it("limpia caracteres de control y limita el largo", () => {
    const r = parseCheckoutForm(form({ line1: "Calle\u0000 con\ncontrol " + "x".repeat(400) }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.line1).not.toMatch(/[\u0000-\u001f]/);
      expect(r.value.line1.length).toBeLessThanOrEqual(200);
    }
  });
  it("ignora cualquier campo de monto que venga del formulario", () => {
    const data = form();
    data.set("total", "1");
    data.set("price", "1");
    const r = parseCheckoutForm(data);
    expect(r.ok).toBe(true);
    if (r.ok) expect(Object.keys(r.value)).not.toContain("total");
  });
});

describe("splitName", () => {
  it("divide nombre y apellidos", () => {
    expect(splitName("Ana Soto")).toEqual({ firstName: "Ana", lastName: "Soto" });
    expect(splitName("Ana María Soto Rojas")).toEqual({ firstName: "Ana María", lastName: "Soto Rojas" });
  });
});
