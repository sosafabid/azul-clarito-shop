import { describe, expect, it } from "vitest";
import {
  LOCK_MINUTES,
  MAX_FAILED_LOGIN_ATTEMPTS,
  SESSION_TTL_DAYS,
  isLocked,
  isPlausibleEmail,
  normalizeEmail,
  sessionExpiry,
  validatePassword,
} from "./auth";

describe("política de contraseña", () => {
  it("exige 12 caracteres o más", () => {
    expect(validatePassword("corta")).toMatch(/al menos 12/);
    expect(validatePassword("una-contraseña-larga-1")).toBeNull();
  });
  it("rechaza un solo carácter repetido y la contraseña igual al correo", () => {
    expect(validatePassword("aaaaaaaaaaaaaaaa")).toMatch(/repetido/);
    expect(validatePassword("persona@ejemplo.com", "Persona@Ejemplo.com")).toMatch(/igual al correo/);
  });
  it("tope razonable de longitud", () => {
    expect(validatePassword("x".repeat(201) + "y")).toMatch(/demasiado larga/);
  });
});

describe("correo", () => {
  it("normaliza a minúsculas y sin espacios", () => {
    expect(normalizeEmail("  Persona@Ejemplo.COM ")).toBe("persona@ejemplo.com");
  });
  it("detecta correos plausibles", () => {
    expect(isPlausibleEmail("a@b.co")).toBe(true);
    expect(isPlausibleEmail("sin-arroba")).toBe(false);
    expect(isPlausibleEmail("a b@c.d")).toBe(false);
  });
});

describe("bloqueo y sesión", () => {
  it("constantes razonables", () => {
    expect(MAX_FAILED_LOGIN_ATTEMPTS).toBe(5);
    expect(LOCK_MINUTES).toBe(15);
    expect(SESSION_TTL_DAYS).toBe(7);
  });
  it("isLocked solo mientras no venza", () => {
    const now = new Date("2026-10-05T12:00:00Z");
    expect(isLocked(null, now)).toBe(false);
    expect(isLocked(new Date("2026-10-05T12:10:00Z"), now)).toBe(true);
    expect(isLocked(new Date("2026-10-05T11:59:59Z"), now)).toBe(false);
  });
  it("la sesión vence a los 7 días", () => {
    const now = new Date("2026-10-05T12:00:00Z");
    expect(sessionExpiry(now).toISOString()).toBe("2026-10-12T12:00:00.000Z");
  });
});
