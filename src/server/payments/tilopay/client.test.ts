import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consultOrder, createPaymentSession, resetTilopayTokenCache, TilopayError } from "./client";
import type { TilopayConfig } from "./config";

const config: TilopayConfig = { mode: "sandbox", apiUser: "USER_SECRET", apiPassword: "PASSWORD_SECRET", key: "KEY_SECRET", merchantId: "", currencies: ["CRC"] };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => resetTilopayTokenCache());
afterEach(() => vi.restoreAllMocks());

describe("cliente de Tilopay", () => {
  it("hace login una vez y reutiliza el token (Bearer) en las llamadas siguientes", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const u = String(url);
      if (u.endsWith("/api/v1/login")) return json({ access_token: "jwt-token-value", token_type: "bearer", expires_in: 86400 });
      if (u.endsWith("/api/v1/consult")) {
        expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer jwt-token-value");
        return json({ type: "200", message: "", response: [] });
      }
      throw new Error("url inesperada " + u);
    });
    await consultOrder(config, "AC-1");
    await consultOrder(config, "AC-1");
    expect(fetchMock.mock.calls.filter(([u]) => String(u).endsWith("/login"))).toHaveLength(1);
    expect(fetchMock.mock.calls.every(([u]) => String(u).startsWith("https://app.tilopay.com/"))).toBe(true);
  });

  it("si el token es rechazado (401) lo renueva una vez y reintenta", async () => {
    let logins = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const u = String(url);
      if (u.endsWith("/login")) return json({ access_token: `token-number-${++logins}`, expires_in: 86400 });
      return (init?.headers as Record<string, string>).Authorization === "Bearer token-number-2" ? json({ type: "200", response: [] }) : json({ message: "Unauthorized" }, 401);
    });
    await expect(consultOrder(config, "AC-1")).resolves.toEqual([]);
    expect(logins).toBe(2);
  });

  it("un error de red o credenciales inválidas lanzan TilopayError SIN filtrar secretos", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("boom USER_SECRET PASSWORD_SECRET"));
    const error = await consultOrder(config, "AC-1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TilopayError);
    expect((error as TilopayError).kind).toBe("network");
    expect(String((error as Error).message)).not.toMatch(/SECRET/);

    resetTilopayTokenCache();
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => json({ message: "bad credentials PASSWORD_SECRET" }, 400));
    const auth = await consultOrder(config, "AC-1").catch((e: unknown) => e);
    expect((auth as TilopayError).kind).toBe("auth");
    expect(String((auth as Error).message)).not.toMatch(/SECRET/);
  });

  it("processPayment exige una URL de tilopay.com; el cuerpo de la petición nunca aparece en el error", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => (String(url).endsWith("/login") ? json({ access_token: "jwt-token-value", expires_in: 100 }) : json({ type: "100", url: "https://evil.example/pay" })));
    const error = await createPaymentSession(config, { key: "KEY_SECRET", billToEmail: "persona@example.com" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TilopayError);
    expect(String((error as Error).message)).not.toMatch(/KEY_SECRET|persona@example.com|evil/);
  });

  it("devuelve la URL de pago válida", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => (String(url).endsWith("/login") ? json({ access_token: "jwt-token-value", expires_in: 100 }) : json({ type: "100", html: "Use url redirect", url: "https://secure.tilopay.com/htmls/1_2file.html" })));
    await expect(createPaymentSession(config, {})).resolves.toEqual({ url: "https://secure.tilopay.com/htmls/1_2file.html" });
  });

  it("una consulta con formato inesperado lanza invalid_response", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => (String(url).endsWith("/login") ? json({ access_token: "jwt-token-value", expires_in: 100 }) : json({ type: "500" })));
    const error = await consultOrder(config, "AC-1").catch((e: unknown) => e);
    expect((error as TilopayError).kind).toBe("invalid_response");
  });
});
