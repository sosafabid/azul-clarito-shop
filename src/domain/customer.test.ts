import { describe, expect, it } from "vitest";
import { currentConsents, hasRequiredConsents, type ConsentEvent } from "./consent";
import { parsePasswordChange, parsePhone, parseProfileForm, parseRegistrationForm } from "./customer-form";

const valid = {
  name: "  Ana   María  Pérez ",
  email: " Ana@Ejemplo.COM ",
  phone: "+506 8888-1234",
  password: "una-contraseña-larga-1",
  passwordConfirm: "una-contraseña-larga-1",
  acceptTerms: "on",
  acceptPrivacy: "on",
};

describe("registro", () => {
  it("acepta un registro válido y normaliza nombre y correo", () => {
    const r = parseRegistrationForm(valid);
    expect(r.ok && r.data).toMatchObject({ name: "Ana María Pérez", email: "ana@ejemplo.com", phone: "+506 8888-1234", marketing: false });
  });

  it("el marketing es opcional y por defecto NO", () => {
    expect(parseRegistrationForm(valid).ok && (parseRegistrationForm(valid) as { data: { marketing: boolean } }).data.marketing).toBe(false);
    const withMarketing = parseRegistrationForm({ ...valid, marketing: "on" });
    expect(withMarketing.ok && withMarketing.data.marketing).toBe(true);
  });

  it("exige los dos consentimientos obligatorios EN EL SERVIDOR", () => {
    const noTerms = parseRegistrationForm({ ...valid, acceptTerms: undefined });
    expect(!noTerms.ok && noTerms.errors.acceptTerms).toMatch(/Términos/);
    const noPrivacy = parseRegistrationForm({ ...valid, acceptPrivacy: "" });
    expect(!noPrivacy.ok && noPrivacy.errors.acceptPrivacy).toMatch(/datos personales/);
    expect(parseRegistrationForm({ ...valid, marketing: "on", acceptTerms: undefined }).ok).toBe(false);
  });

  it("valida contraseña (12+), confirmación, correo, nombre y teléfono", () => {
    const bad = parseRegistrationForm({ ...valid, password: "corta", passwordConfirm: "corta", email: "x", name: "A", phone: "abc" });
    expect(!bad.ok && Object.keys(bad.errors).sort()).toEqual(["email", "name", "password", "phone"]);
    const mismatch = parseRegistrationForm({ ...valid, passwordConfirm: "otra-contraseña-larga-2" });
    expect(!mismatch.ok && mismatch.errors.passwordConfirm).toMatch(/no coinciden/);
  });

  it("el teléfono es opcional", () => {
    expect(parsePhone("")).toEqual({ ok: true, value: null });
    expect(parsePhone("   ")).toEqual({ ok: true, value: null });
    expect(parsePhone("8888 1234")).toEqual({ ok: true, value: "8888 1234" });
    expect(parsePhone("12345").ok).toBe(false);
  });

  it("rechaza caracteres de control en el nombre", () => {
    expect(parseRegistrationForm({ ...valid, name: "Ana\u0000Pérez" }).ok).toBe(false);
  });
});

describe("perfil y cambio de contraseña", () => {
  it("perfil", () => {
    expect(parseProfileForm({ name: "Luz", phone: "" }).ok).toBe(true);
    expect(parseProfileForm({ name: "L", phone: "x" }).ok).toBe(false);
  });
  it("la contraseña nueva debe ser válida, distinta de la actual y confirmada", () => {
    const base = { currentPassword: "contraseña-actual-123", newPassword: "contraseña-nueva-456", newPasswordConfirm: "contraseña-nueva-456" };
    expect(parsePasswordChange(base, "a@b.co").ok).toBe(true);
    expect(parsePasswordChange({ ...base, newPassword: "contraseña-actual-123", newPasswordConfirm: "contraseña-actual-123" }, "a@b.co").ok).toBe(false);
    expect(parsePasswordChange({ ...base, newPasswordConfirm: "otra" }, "a@b.co").ok).toBe(false);
    expect(parsePasswordChange({ ...base, newPassword: "corta", newPasswordConfirm: "corta" }, "a@b.co").ok).toBe(false);
    expect(parsePasswordChange({ ...base, currentPassword: "" }, "a@b.co").ok).toBe(false);
  });
});

describe("consentimientos (eventos)", () => {
  const at = (n: number) => new Date(`2026-10-0${n}T12:00:00Z`);
  const ev = (type: ConsentEvent["type"], granted: boolean, day: number, version = "v1"): ConsentEvent => ({ type, granted, version, createdAt: at(day) });

  it("el estado actual es el evento más reciente de cada tipo", () => {
    const current = currentConsents([ev("MARKETING", true, 1), ev("MARKETING", false, 3), ev("TERMS", true, 1)]);
    expect(current.MARKETING).toMatchObject({ granted: false });
    expect(current.TERMS).toMatchObject({ granted: true, version: "v1" });
    expect(current.PRIVACY).toBeUndefined();
  });
  it("no importa el orden en que lleguen los eventos", () => {
    expect(currentConsents([ev("MARKETING", false, 3), ev("MARKETING", true, 1)]).MARKETING?.granted).toBe(false);
  });
  it("los obligatorios son términos y privacidad; marketing no cuenta", () => {
    expect(hasRequiredConsents([ev("TERMS", true, 1), ev("PRIVACY", true, 1)])).toBe(true);
    expect(hasRequiredConsents([ev("TERMS", true, 1)])).toBe(false);
    expect(hasRequiredConsents([ev("TERMS", true, 1), ev("PRIVACY", true, 1), ev("PRIVACY", false, 2)])).toBe(false);
    expect(hasRequiredConsents([ev("MARKETING", true, 1)])).toBe(false);
  });
});
