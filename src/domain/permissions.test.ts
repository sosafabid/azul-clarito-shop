import { describe, expect, it } from "vitest";
import { can } from "./permissions";
import { hasAtLeastRole, isStaffRole } from "./roles";

describe("roles", () => {
  it("respeta la jerarquía", () => {
    expect(hasAtLeastRole("SUPER_ADMIN", "STAFF")).toBe(true);
    expect(hasAtLeastRole("STAFF", "STAFF")).toBe(true);
    expect(hasAtLeastRole("CUSTOMER", "STAFF")).toBe(false);
  });

  it("solo SUPER_ADMIN y STAFF son del equipo", () => {
    expect(isStaffRole("SUPER_ADMIN")).toBe(true);
    expect(isStaffRole("STAFF")).toBe(true);
    expect(isStaffRole("CUSTOMER")).toBe(false);
  });
});

describe("permisos", () => {
  it("una clienta no puede administrar nada", () => {
    expect(can("CUSTOMER", "products:write")).toBe(false);
    expect(can("CUSTOMER", "orders:read")).toBe(false);
  });

  it("sin rol no hay permisos", () => {
    expect(can(null, "products:read")).toBe(false);
    expect(can(undefined, "products:read")).toBe(false);
  });

  it("staff gestiona catálogo y pedidos, pero no reembolsos ni roles", () => {
    expect(can("STAFF", "products:write")).toBe(true);
    expect(can("STAFF", "orders:fulfill")).toBe(true);
    expect(can("STAFF", "orders:refund")).toBe(false);
    expect(can("STAFF", "users:manage-roles")).toBe(false);
  });

  it("eliminar productos definitivamente es solo de SUPER_ADMIN", () => {
    expect(can("SUPER_ADMIN", "products:delete")).toBe(true);
    expect(can("STAFF", "products:delete")).toBe(false);
    expect(can("CUSTOMER", "products:delete")).toBe(false);
  });

  it("SUPER_ADMIN puede todo lo sensible", () => {
    expect(can("SUPER_ADMIN", "orders:refund")).toBe(true);
    expect(can("SUPER_ADMIN", "users:manage-roles")).toBe(true);
  });
});
