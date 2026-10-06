import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDb, isDatabaseConfigured } from "@/db";
import { sessions, users } from "@/db/schema";
import { sessionExpiry } from "@/domain/auth";
import type { UserRole } from "@/domain/roles";

export type AuthSession = {
  userId: string;
  email: string;
  name: string | null;
  role: UserRole;
};

export const SESSION_COOKIE = "ac_session";

/** En la base solo se guarda el hash del token: la cookie es la única copia utilizable. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Devuelve la sesión de quien hace la petición, o `null`.
 *
 * - Lee la cookie, busca su hash en `sessions` y exige que no haya vencido.
 * - El ROL se lee de `users` en cada petición (no de la cookie): si se le quita
 *   un permiso a alguien o se la desactiva, deja de tener acceso de inmediato.
 * - `cache` evita repetir la consulta dentro de una misma petición.
 * - Leer cookies hace que la ruta se renderice por petición (nunca estática).
 */
export const getSession = cache(async (): Promise<AuthSession | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length < 20 || token.length > 200) return null;
  if (!isDatabaseConfigured()) return null;

  const [row] = await getDb()
    .select({ userId: users.id, email: users.email, name: users.name, role: users.role, isActive: users.isActive })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!row || !row.isActive) return null;
  return { userId: row.userId, email: row.email, name: row.name, role: row.role };
});

/** Hash de la sesión ACTUAL (para poder conservarla cuando se cierran las demás). */
export async function getCurrentTokenHash(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? hashToken(token) : null;
}

/** Crea la sesión (fila + cookie). Solo se llama después de verificar la contraseña. */
export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = sessionExpiry();
  const db = getDb();

  await db.batch([
    // De paso, limpia las sesiones ya vencidas de esta persona.
    db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date()))),
    db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt }),
  ]);

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** Cierra la sesión actual: borra la fila y la cookie. */
export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token && isDatabaseConfigured()) {
    await getDb().delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  store.delete(SESSION_COOKIE);
}
