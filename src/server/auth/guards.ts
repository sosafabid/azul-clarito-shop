import "server-only";
import { notFound, redirect } from "next/navigation";
import { routes } from "@/config/routes";
import { can, type Permission } from "@/domain/permissions";
import { STAFF_ROLES, type UserRole } from "@/domain/roles";
import { getSession, type AuthSession } from "./session";

/**
 * AUTORIZACIÓN EN EL SERVIDOR (separada de la UI).
 *
 * Reglas del proyecto:
 *  1. Esconder un enlace o un botón NO protege nada. Cada página y cada Server
 *     Action administrativa llama a uno de estos guards.
 *  2. Un `layout.tsx` NO protege las Server Actions: cada acción vuelve a
 *     llamar al guard (por eso hay una prueba que lo exige).
 *  3. Sin sesión → se redirige al login. Con sesión pero sin permiso → 404.
 *  4. FALLA CERRADO: no existe ningún atajo ni bandera de desarrollo que
 *     salte la autenticación.
 */
export async function requireRole(allowed: readonly UserRole[]): Promise<AuthSession> {
  const session = await getSession();
  if (!session) redirect(routes.adminLogin);
  if (!allowed.includes(session.role)) notFound();
  return session;
}

/** Exige un permiso concreto (ver `src/domain/permissions.ts`). */
export async function requirePermission(permission: Permission): Promise<AuthSession> {
  const session = await getSession();
  if (!session) redirect(routes.adminLogin);
  if (!can(session.role, permission)) notFound();
  return session;
}

/** Atajo: cualquier persona del equipo (SUPER_ADMIN o STAFF). */
export function requireStaff(): Promise<AuthSession> {
  return requireRole(STAFF_ROLES);
}
