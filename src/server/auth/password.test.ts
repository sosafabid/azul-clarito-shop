import { describe, expect, it } from "vitest";
import { burnPasswordCheck, hashPassword, verifyPassword } from "./password";

describe("hash de contraseñas (scrypt)", () => {
  it("verifica la contraseña correcta y rechaza la incorrecta", async () => {
    const hash = await hashPassword("una-contraseña-larga-1");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(hash).not.toContain("una-contraseña-larga-1");
    expect(await verifyPassword("una-contraseña-larga-1", hash)).toBe(true);
    expect(await verifyPassword("una-contraseña-larga-2", hash)).toBe(false);
  });

  it("cada hash usa una sal distinta", async () => {
    expect(await hashPassword("misma-contraseña-123")).not.toBe(await hashPassword("misma-contraseña-123"));
  });

  it("hashes mal formados nunca validan", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "bcrypt$1$2$3$4$5")).toBe(false);
    expect(await verifyPassword("x", "scrypt$1$2")).toBe(false);
  });

  it("burnPasswordCheck no falla", async () => {
    await expect(burnPasswordCheck("lo-que-sea")).resolves.toBeUndefined();
  });
});
