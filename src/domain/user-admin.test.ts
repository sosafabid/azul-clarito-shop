import { describe, expect, it } from "vitest";
import { escapeLike, evaluateRoleChange, evaluateStaffAccessChange, parsePage, parseRoleFilter, parseUserSearch, type Actor, type Target } from "./user-admin";

const sa: Actor = { id: "a", role: "SUPER_ADMIN" };
const customer: Target = { id: "c", role: "CUSTOMER", isActive: true };
const staff: Target = { id: "s", role: "STAFF", isActive: true };

describe("cambio de rol", () => {
  it("SUPER_ADMIN asigna STAFF a una clienta y la devuelve a CUSTOMER", () => {
    expect(evaluateRoleChange(sa, customer, "STAFF").ok).toBe(true);
    expect(evaluateRoleChange(sa, staff, "CUSTOMER").ok).toBe(true);
  });
  it("STAFF y CUSTOMER no pueden cambiar roles (ni el propio ni el ajeno)", () => {
    expect(evaluateRoleChange({ id: "s", role: "STAFF" }, staff, "SUPER_ADMIN")).toMatchObject({ ok: false, code: "actor_not_super_admin" });
    expect(evaluateRoleChange({ id: "s", role: "STAFF" }, customer, "STAFF")).toMatchObject({ ok: false, code: "actor_not_super_admin" });
    expect(evaluateRoleChange({ id: "c", role: "CUSTOMER" }, customer, "STAFF")).toMatchObject({ ok: false, code: "actor_not_super_admin" });
  });
  it("nadie se cambia a sí mismo, SUPER_ADMIN no se toca y SUPER_ADMIN nunca se asigna", () => {
    expect(evaluateRoleChange(sa, { id: "a", role: "SUPER_ADMIN", isActive: true }, "STAFF")).toMatchObject({ code: "self" });
    expect(evaluateRoleChange(sa, { id: "x", role: "SUPER_ADMIN", isActive: true }, "STAFF")).toMatchObject({ code: "target_is_super_admin" });
    expect(evaluateRoleChange(sa, customer, "SUPER_ADMIN")).toMatchObject({ code: "invalid_role" });
    expect(evaluateRoleChange(sa, customer, "ADMIN")).toMatchObject({ code: "invalid_role" });
    expect(evaluateRoleChange(sa, staff, "STAFF")).toMatchObject({ code: "no_change" });
  });
});

describe("suspender / reactivar", () => {
  it("solo SUPER_ADMIN y solo sobre STAFF", () => {
    expect(evaluateStaffAccessChange(sa, staff, true).ok).toBe(true);
    expect(evaluateStaffAccessChange(sa, { ...staff, isActive: false }, false).ok).toBe(true);
    expect(evaluateStaffAccessChange(sa, customer, true)).toMatchObject({ code: "not_staff" });
    expect(evaluateStaffAccessChange(sa, staff, false)).toMatchObject({ code: "already_in_state" });
    expect(evaluateStaffAccessChange({ id: "s", role: "STAFF" }, staff, true)).toMatchObject({ code: "actor_not_super_admin" });
    expect(evaluateStaffAccessChange(sa, { id: "a", role: "SUPER_ADMIN", isActive: true }, true)).toMatchObject({ code: "self" });
  });
});

describe("filtros y búsqueda", () => {
  it("valores desconocidos caen al valor por defecto", () => {
    expect(parseRoleFilter("HACKER")).toBe("todos");
    expect(parseRoleFilter("STAFF")).toBe("STAFF");
    expect(parsePage("-3")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("4")).toBe(4);
  });
  it("la búsqueda se recorta y los comodines de LIKE se escapan", () => {
    expect(parseUserSearch("  ana\u0000 ")).toBe("ana");
    expect(parseUserSearch("x".repeat(500)).length).toBe(80);
    expect(escapeLike("50%_\\")).toBe("50\\%\\_\\\\");
  });
});
