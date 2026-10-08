import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { AUTH_MESSAGES, RATE_LIMITS, TOKEN_TTL_MINUTES, isPlausibleToken, tokenExpiry } from "./auth-tokens";

describe("tokens de correo", () => {
  it("el restablecimiento vence antes que la verificación", () => {
    expect(TOKEN_TTL_MINUTES.PASSWORD_RESET).toBe(60);
    expect(TOKEN_TTL_MINUTES.EMAIL_VERIFICATION).toBe(24 * 60);
  });

  it("calcula el vencimiento desde la fecha dada", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(tokenExpiry("PASSWORD_RESET", now).toISOString()).toBe("2026-01-01T01:00:00.000Z");
    expect(tokenExpiry("EMAIL_VERIFICATION", now).toISOString()).toBe("2026-01-02T00:00:00.000Z");
  });

  it("reconoce el formato de un token real y descarta basura", () => {
    expect(isPlausibleToken(randomBytes(32).toString("base64url"))).toBe(true);
    for (const bad of ["", "abc", "x".repeat(42), "x".repeat(44), `${"a".repeat(42)}!`, `${"a".repeat(42)}'`, "' or 1=1 --".padEnd(43, "a")]) {
      expect(isPlausibleToken(bad)).toBe(false);
    }
  });

  it("los límites existen y son finitos", () => {
    for (const limit of Object.values(RATE_LIMITS)) {
      expect(limit.max).toBeGreaterThan(0);
      expect(limit.windowSeconds).toBeGreaterThan(0);
    }
  });

  it("el mensaje de 'olvidé mi contraseña' es el texto exacto acordado", () => {
    expect(AUTH_MESSAGES.forgotGeneric).toBe("Si existe una cuenta asociada a este correo, recibirás un enlace para restablecer tu contraseña.");
    expect(AUTH_MESSAGES.invalidLink).toBe("Este enlace ya no es válido o expiró.");
  });
});
