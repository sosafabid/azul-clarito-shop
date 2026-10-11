import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PRODUCTION_CONFIRMATION, isPaymentsEnabled, readTilopayConfig } from "./config";

const NAMES = ["TILOPAY_API_USER", "TILOPAY_API_PASSWORD", "TILOPAY_API_KEY", "TILOPAY_MERCHANT_ID", "TILOPAY_MODE", "TILOPAY_CONFIRM_PRODUCTION", "TILOPAY_CURRENCIES"];
const saved: Record<string, string | undefined> = {};
beforeEach(() => {
  for (const n of NAMES) {
    saved[n] = process.env[n];
    delete process.env[n];
  }
});
afterEach(() => {
  for (const n of NAMES) {
    if (saved[n] === undefined) delete process.env[n];
    else process.env[n] = saved[n];
  }
});
const creds = () => {
  process.env.TILOPAY_API_USER = "u";
  process.env.TILOPAY_API_PASSWORD = "p";
  process.env.TILOPAY_API_KEY = "k";
};

describe("configuración de Tilopay (falla cerrado)", () => {
  it("sin credenciales los pagos están deshabilitados y se informa solo el NOMBRE de lo que falta", () => {
    const state = readTilopayConfig();
    expect(state).toEqual({ ok: false, reason: "not_configured", missing: ["TILOPAY_API_USER", "TILOPAY_API_PASSWORD", "TILOPAY_API_KEY"] });
    expect(isPaymentsEnabled()).toBe(false);
  });
  it("con credenciales y sin TILOPAY_MODE el modo es sandbox", () => {
    creds();
    const state = readTilopayConfig();
    expect(state.ok && state.config.mode).toBe("sandbox");
    expect(state.ok && state.config.currencies).toEqual(["CRC"]);
  });
  it("un modo desconocido deshabilita los pagos", () => {
    creds();
    process.env.TILOPAY_MODE = "live";
    expect(readTilopayConfig()).toMatchObject({ ok: false, reason: "invalid_mode" });
  });
  it("producción exige la confirmación explícita aparte", () => {
    creds();
    process.env.TILOPAY_MODE = "production";
    expect(readTilopayConfig()).toMatchObject({ ok: false, reason: "production_not_confirmed" });
    process.env.TILOPAY_CONFIRM_PRODUCTION = "yes";
    expect(readTilopayConfig()).toMatchObject({ ok: false, reason: "production_not_confirmed" });
    process.env.TILOPAY_CONFIRM_PRODUCTION = PRODUCTION_CONFIRMATION;
    const state = readTilopayConfig();
    expect(state.ok && state.config.mode).toBe("production");
  });
  it("solo acepta monedas soportadas y cae a CRC", () => {
    creds();
    process.env.TILOPAY_CURRENCIES = "crc, usd, xyz";
    const state = readTilopayConfig();
    expect(state.ok && state.config.currencies).toEqual(["CRC", "USD"]);
    process.env.TILOPAY_CURRENCIES = "xyz";
    const fallback = readTilopayConfig();
    expect(fallback.ok && fallback.config.currencies).toEqual(["CRC"]);
  });
});
