import "server-only";
import { notFound } from "next/navigation";
import { serverConfig } from "@/config/server";
import { can, type Permission } from "@/domain/permissions";
import { STAFF_ROLES, type UserRole } from "@/domain/roles";
import { DEV_PREVIEW_USER_ID, getSession, type AuthSession } from "./session";

/**
 * AUTORIZACIÓN EN EL SERVIDOR (separada de la UI).
 *
 * Reglas del proyecto:
 *  1. Esconder un enlace o un botón NO protege nada. Cada página, Server
 *     Action y Route Handler administrativo debe llamar a uno de estos guards.
 *  2. Un `layout.tsx` NO protege las Server Actions ni los Route Handlers que
 *     estén dentro de esa carpeta: cada acción vuelve a llamar al guard.
 *  3. Si no hay permiso, se responde 404 (no se revela que /admin existe).
 *  4. FALLA CERRADO: sin sesión válida el acceso se niega, siempre.
 *
 * Única excepción: en desarrollo local, con `DEV_ADMIN_PREVIEW=true`, se
 * devuelve una sesión falsa para poder ver las pantallas. En producción
 * (`NODE_ENV=production`) esa excepción NUNCA se aplica, aunque la variable
 * esté definida.
 */
const DEV_PREVIEW_SESSION: AuthSession = {
  userId: DEV_PREVIEW_USER_ID,
  email: "dev-preview@localhost",
  role: "SUPER_ADMIN",
};

/** Exige que la persona tenga alguno de los roles indicados. */
export async function requireRole(allowed: readonly UserRole[]): Promise<AuthSession> {
  const session = await getSession();
  if (session && allowed.includes(session.role)) return session;
  if (serverConfig.auth.devAdminPreview) return DEV_PREVIEW_SESSION;
  notFound();
}

/** Exige un permiso concreto (ver `src/domain/permissions.ts`). */
export async function requirePermission(permission: Permission): Promise<AuthSession> {
  const session = await getSession();
  if (session && can(session.role, permission)) return session;
  if (serverConfig.auth.devAdminPreview) return DEV_PREVIEW_SESSION;
  notFound();
}

/** Atajo: cualquier persona del equipo (SUPER_ADMIN o STAFF). */
export function requireStaff(): Promise<AuthSession> {
  return requireRole(STAFF_ROLES);
}

export function isDevPreviewSession(session: AuthSession): boolean {
  return session.userId === DEV_PREVIEW_USER_ID;
}
