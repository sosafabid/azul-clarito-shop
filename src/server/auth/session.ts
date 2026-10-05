import "server-only";
import { cookies } from "next/headers";
import type { UserRole } from "@/domain/roles";

export type AuthSession = {
  userId: string;
  email: string;
  role: UserRole;
};

/** Id reservado para la sesión falsa de "vista previa de desarrollo". */
export const DEV_PREVIEW_USER_ID = "dev-preview";

/**
 * Devuelve la sesión de la persona que hace la petición, o `null`.
 *
 * TODAVÍA NO HAY AUTENTICACIÓN: el proveedor (Auth.js, Clerk, Neon Auth, etc.)
 * está por decidirse. Mientras tanto SIEMPRE devuelve `null`, lo que significa
 * que las rutas protegidas niegan el acceso (ver `guards.ts`).
 *
 * Cuando se implemente, este es el único archivo que debe cambiar: leer la
 * cookie de sesión, verificarla en el servidor y buscar el rol en la base de
 * datos (nunca confiar en un rol que venga del navegador).
 */
export async function getSession(): Promise<AuthSession | null> {
  // Leer cookies hace que la ruta se renderice por petición (no estática),
  // que es lo que necesita cualquier ruta protegida.
  await cookies();
  return null;
}
