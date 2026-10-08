import { afterEach, describe, expect, it, vi } from "vitest";
import { ResendEmailService } from "./resend";

const service = () => new ResendEmailService({ apiKey: "re_test_SECRET", from: "Azul Clarito <cuenta@dominio.example>", baseUrl: "https://shop.azulclaritocr.com" });
const request = { event: "password_reset" as const, to: "persona@example.com", data: { name: "Ana", actionUrl: "https://shop.azulclaritocr.com/reset-password?token=t", expiresMinutes: 60 } };

afterEach(() => vi.restoreAllMocks());

describe("cliente de Resend (solo servidor)", () => {
  it("envía a la API de Resend con la clave en el encabezado Authorization (no en la URL ni en el cuerpo)", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response('{"id":"1"}', { status: 200 }));
    const result = await service().send(request);
    expect(result).toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://api.resend.com/emails");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer re_test_SECRET");
    const body = JSON.parse(String(init!.body));
    expect(body.from).toBe("Azul Clarito <cuenta@dominio.example>");
    expect(body.to).toEqual(["persona@example.com"]);
    expect(body.subject).toBe("Restablecé tu contraseña — Azul Clarito");
    expect(JSON.stringify(body)).not.toContain("re_test_SECRET");
    expect(String(url)).not.toContain("re_test_SECRET");
  });

  it("si Resend rechaza el envío devuelve provider_error y NO escribe la clave ni el enlace en los logs", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response('{"message":"domain not verified persona@example.com"}', { status: 403 }));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await service().send(request)).toEqual({ ok: false, reason: "provider_error" });
    const logged = JSON.stringify(error.mock.calls);
    expect(logged).not.toContain("re_test_SECRET");
    expect(logged).not.toContain("token=");
    expect(logged).not.toContain("persona@example.com");
  });

  it("si la red falla no lanza error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await service().send(request)).toEqual({ ok: false, reason: "provider_error" });
  });

  it("los eventos de pedidos todavía no tienen plantilla: no se envía nada a medias", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const result = await service().send({ event: "order_received", to: "a@b.co", data: { orderNumber: "1", total: 1, currency: "CRC" } });
    expect(result).toEqual({ ok: false, reason: "no_template" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
