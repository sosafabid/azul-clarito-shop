/**
 * Roles del sistema.
 *
 * Este archivo es "dominio puro": no importa nada de servidor, base de datos
 * ni React, así que lo pueden usar tanto el schema, como los servicios y la UI.
 */
export const USER_ROLES = ["SUPER_ADMIN", "STAFF", "CUSTOMER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Mayor número = más privilegios. */
const ROLE_RANK: Record<UserRole, number> = {
  CUSTOMER: 0,
  STAFF: 1,
  SUPER_ADMIN: 2,
};

export function hasAtLeastRole(role: UserRole, minimum: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/** Roles que pueden entrar al panel administrativo. */
export const STAFF_ROLES: readonly UserRole[] = ["SUPER_ADMIN", "STAFF"];

export function isStaffRole(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}
