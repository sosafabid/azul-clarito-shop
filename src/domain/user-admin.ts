import type { UserRole } from "./roles";

/**
 * Reglas puras de la gestión de usuarios y roles (sin base de datos).
 * El servicio las consulta ANTES de cambiar nada, y además cada cambio se ejecuta con
 * condiciones en la propia sentencia SQL (y un trigger en la base protege a la última SUPER_ADMIN).
 */
export type Actor = { id: string; role: UserRole };
export type Target = { id: string; role: UserRole; isActive: boolean };

export type Denial = "actor_not_super_admin" | "self" | "target_is_super_admin" | "invalid_role" | "no_change" | "not_staff" | "already_in_state";
export type Decision = { ok: true } | { ok: false; code: Denial; message: string };

const DENIAL_MESSAGES: Record<Denial, string> = {
  actor_not_super_admin: "Solo una persona SUPER_ADMIN puede hacer esto.",
  self: "No podés cambiar tu propio rol ni tu propio acceso.",
  target_is_super_admin: "Las cuentas SUPER_ADMIN no se modifican desde acá.",
  invalid_role: "Ese rol no se puede asignar desde acá. Solo STAFF o CUSTOMER.",
  no_change: "La cuenta ya tiene ese rol.",
  not_staff: "Esta acción solo aplica a cuentas STAFF.",
  already_in_state: "La cuenta ya está en ese estado.",
};

const deny = (code: Denial): Decision => ({ ok: false, code, message: DENIAL_MESSAGES[code] });

/** Roles que se pueden asignar por el panel. SUPER_ADMIN nunca se asigna desde la interfaz. */
export const ASSIGNABLE_ROLES = ["STAFF", "CUSTOMER"] as const satisfies readonly UserRole[];

export function evaluateRoleChange(actor: Actor, target: Target, newRole: string): Decision {
  if (actor.role !== "SUPER_ADMIN") return deny("actor_not_super_admin");
  if (actor.id === target.id) return deny("self");
  if (target.role === "SUPER_ADMIN") return deny("target_is_super_admin");
  if (!(ASSIGNABLE_ROLES as readonly string[]).includes(newRole)) return deny("invalid_role");
  if (target.role === newRole) return deny("no_change");
  return { ok: true };
}

/** Suspender o reactivar el acceso de una persona del equipo (STAFF). */
export function evaluateStaffAccessChange(actor: Actor, target: Target, suspend: boolean): Decision {
  if (actor.role !== "SUPER_ADMIN") return deny("actor_not_super_admin");
  if (actor.id === target.id) return deny("self");
  if (target.role === "SUPER_ADMIN") return deny("target_is_super_admin");
  if (target.role !== "STAFF") return deny("not_staff");
  if (suspend === !target.isActive) return deny("already_in_state");
  return { ok: true };
}

export const USER_ROLE_FILTERS = ["todos", "SUPER_ADMIN", "STAFF", "CUSTOMER"] as const;
export const USER_STATUS_FILTERS = ["todos", "activo", "suspendido"] as const;
export const USER_VERIFIED_FILTERS = ["todos", "verificado", "no-verificado"] as const;
export type UserRoleFilter = (typeof USER_ROLE_FILTERS)[number];
export type UserStatusFilter = (typeof USER_STATUS_FILTERS)[number];
export type UserVerifiedFilter = (typeof USER_VERIFIED_FILTERS)[number];

const pick = <T extends string>(allowed: readonly T[], value: string | undefined, fallback: T): T => (allowed as readonly string[]).includes(value ?? "") ? (value as T) : fallback;

export const parseRoleFilter = (v?: string) => pick(USER_ROLE_FILTERS, v, "todos");
export const parseStatusFilter = (v?: string) => pick(USER_STATUS_FILTERS, v, "todos");
export const parseVerifiedFilter = (v?: string) => pick(USER_VERIFIED_FILTERS, v, "todos");

/** Búsqueda: recorta, limita el largo y escapa los comodines de LIKE (% _ \). */
export function parseUserSearch(raw: string | undefined): string {
  return (raw ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 80);
}
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export const USERS_PAGE_SIZE = 20;
export function parsePage(raw: string | undefined): number {
  const n = /^\d{1,5}$/.test(raw ?? "") ? Number(raw) : 1;
  return Math.max(1, n);
}

/** Acciones de auditoría de esta fase (nombres acordados). */
export const USER_AUDIT_ACTIONS = [
  "staff_invited",
  "staff_invitation_accepted",
  "staff_invitation_revoked",
  "user_role_changed",
  "staff_access_suspended",
  "staff_access_reactivated",
  "user_administrative_access_removed",
] as const;
export type UserAuditAction = (typeof USER_AUDIT_ACTIONS)[number];

export const USER_AUDIT_LABELS: Record<UserAuditAction, string> = {
  staff_invited: "Invitación a STAFF enviada",
  staff_invitation_accepted: "Invitación a STAFF aceptada",
  staff_invitation_revoked: "Invitación a STAFF revocada",
  user_role_changed: "Cambio de rol",
  staff_access_suspended: "Acceso suspendido",
  staff_access_reactivated: "Acceso reactivado",
  user_administrative_access_removed: "Acceso administrativo retirado",
};

export const STAFF_INVITATION_TTL_HOURS = 72;
export const MAX_INVITATIONS_PER_HOUR = 20;
