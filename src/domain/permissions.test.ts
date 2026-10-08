import { describe, expect, it } from "vitest";
import { PERMISSIONS, can, permissionsOf } from "./permissions";
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

describe("matriz de autorización (fase usuarios y roles)", () => {
  it("solo SUPER_ADMIN gestiona usuarios, roles e invitaciones", () => {
    for (const p of ["users:read", "users:manage-roles", "users:invite"] as const) {
      expect(can("SUPER_ADMIN", p)).toBe(true);
      expect(can("STAFF", p)).toBe(false);
      expect(can("CUSTOMER", p)).toBe(false);
    }
  });

  it("STAFF: tareas operativas sí; costos, impuestos, envíos, integraciones, auditoría y publicación no", () => {
    for (const p of ["products:read", "products:write", "inventory:read", "orders:read", "orders:fulfill", "orders:customer-delivery-data"] as const) {
      expect(can("STAFF", p), p).toBe(true);
    }
    for (const p of ["products:publish", "products:delete", "inventory:write", "costs:read", "settings:read", "settings:write", "integrations:manage", "audit:read", "customers:read", "orders:refund"] as const) {
      expect(can("STAFF", p), p).toBe(false);
    }
  });

  it("CUSTOMER no tiene ningún permiso del panel", () => {
    expect(permissionsOf("CUSTOMER")).toEqual([]);
  });

  it("SUPER_ADMIN tiene todos los permisos de la matriz", () => {
    expect(permissionsOf("SUPER_ADMIN").length).toBe(Object.keys(PERMISSIONS).length);
  });
});
