import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { authTokens, users } from "@/db/schema";
import { isPlausibleToken, tokenExpiry, type AuthTokenPurpose } from "@/domain/auth-tokens";

/**
 * Tokens de un solo uso (verificar correo / restablecer contraseña) sobre el MISMO
 * sistema de autenticación de la tienda: no hay un segundo sistema.
 *
 *  - El token es aleatorio (256 bits, `crypto.randomBytes`).
 *  - En la base solo se guarda su sha256: la copia utilizable existe solo en el correo.
 *  - Vence (`expires_at`) y se consume de forma ATÓMICA (`used_at`): una sola sentencia
 *    `UPDATE … WHERE used_at IS NULL AND expires_at > now() RETURNING`, así dos
 *    peticiones simultáneas con el mismo enlace no pueden ganar las dos.
 *  - Emitir uno nuevo invalida los anteriores pendientes del mismo tipo.
 *  - Nunca se guarda en localStorage ni en cookies: viaja una vez por la URL del correo.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Crea un token nuevo para la persona y devuelve la copia en claro (para el correo). */
export async function issueToken(db: Database, userId: string, purpose: AuthTokenPurpose): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.batch([
    // Limpia los pendientes anteriores de este tipo y los ya vencidos.
    db
      .delete(authTokens)
      .where(and(eq(authTokens.userId, userId), eq(authTokens.purpose, purpose), or(isNull(authTokens.usedAt), lt(authTokens.expiresAt, new Date())))),
    db.insert(authTokens).values({ userId, purpose, tokenHash: hashToken(token), expiresAt: tokenExpiry(purpose) }),
  ]);
  return token;
}

export type PeekedToken = { userId: string; email: string; name: string | null };

/** Mira si un token sirve SIN consumirlo (para mostrar el formulario o el aviso de enlace vencido). */
export async function peekToken(db: Database, token: string, purpose: AuthTokenPurpose): Promise<PeekedToken | null> {
  if (!isPlausibleToken(token)) return null;
  const [row] = await db
    .select({ userId: users.id, email: users.email, name: users.name })
    .from(authTokens)
    .innerJoin(users, eq(users.id, authTokens.userId))
    .where(
      and(
        eq(authTokens.tokenHash, hashToken(token)),
        eq(authTokens.purpose, purpose),
        isNull(authTokens.usedAt),
        sql`${authTokens.expiresAt} > now()`,
        eq(users.isActive, true),
      ),
    )
    .limit(1);
  return row ?? null;
}
