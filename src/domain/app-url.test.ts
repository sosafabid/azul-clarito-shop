import { describe, expect, it } from "vitest";
import { CANONICAL_APP_URL, resolveAppBaseUrl } from "./app-url";

describe("URL base de los enlaces de los correos", () => {
  it("en producción usa el dominio configurado si es https y público", () => {
    expect(resolveAppBaseUrl("https://shop.azulclaritocr.com", "production")).toBe("https://shop.azulclaritocr.com");
    expect(resolveAppBaseUrl("https://shop.azulclaritocr.com/", "production")).toBe("https://shop.azulclaritocr.com");
    expect(resolveAppBaseUrl("https://shop.azulclaritocr.com/cualquier/ruta?x=1", "production")).toBe("https://shop.azulclaritocr.com");
  });

  it("en producción NUNCA usa localhost, IPs, vercel.app, http ni valores inválidos", () => {
    for (const bad of [
      "http://localhost:3000",
      "https://localhost",
      "http://127.0.0.1:3000",
      "https://192.168.1.10",
      "https://azul-clarito-shop-git-main.vercel.app",
      "http://shop.azulclaritocr.com",
      "no es una url",
      "",
      undefined,
    ]) {
      expect(resolveAppBaseUrl(bad, "production")).toBe(CANONICAL_APP_URL);
    }
  });

  it("en desarrollo respeta la URL local", () => {
    expect(resolveAppBaseUrl("http://localhost:3000", "development")).toBe("http://localhost:3000");
    expect(resolveAppBaseUrl(undefined, "development")).toBe("http://localhost:3000");
  });
});
