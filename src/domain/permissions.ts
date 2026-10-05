import type { UserRole } from "./roles";

/**
 * Mapa central de permisos (qué rol puede hacer qué).
 *
 * IMPORTANTE: esconder un botón en la UI NO es seguridad. La UI puede usar
 * `can()` para decidir qué mostrar, pero la autorización real SIEMPRE se
 * vuelve a comprobar en el servidor (ver `src/server/auth/guards.ts`).
 */
export const PERMISSIONS = {
  "products:read": ["SUPER_ADMIN", "STAFF"],
  "products:write": ["SUPER_ADMIN", "STAFF"],
  "inventory:read": ["SUPER_ADMIN", "STAFF"],
  "inventory:write": ["SUPER_ADMIN", "STAFF"],
  "orders:read": ["SUPER_ADMIN", "STAFF"],
  "orders:fulfill": ["SUPER_ADMIN", "STAFF"],
  "orders:refund": ["SUPER_ADMIN"],
  "customers:read": ["SUPER_ADMIN", "STAFF"],
  "users:manage-roles": ["SUPER_ADMIN"],
  "audit:read": ["SUPER_ADMIN"],
  "settings:write": ["SUPER_ADMIN"],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}
