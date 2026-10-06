import "server-only";
import { eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { users } from "@/db/schema";
import { LOCK_MINUTES, MAX_FAILED_LOGIN_ATTEMPTS, MAX_PASSWORD_LENGTH, isLocked, isPlausibleEmail, normalizeEmail } from "@/domain/auth";
import { isStaffRole, type UserRole } from "@/domain/roles";
import { burnPasswordCheck, verifyPassword } from "@/server/auth/password";
import { auditInsert } from "@/server/services/audit";

/**
 * Verificación de credenciales, COMPARTIDA por el login del equipo y el de las clientas.
 *
 * Protecciones: no revela si el correo existe, gasta el mismo tiempo con un hash
 * ficticio cuando no existe, bloquea la cuenta 15 minutos tras 5 intentos fallidos
 * (con incremento atómico en la base) y deja auditoría del bloqueo y del ingreso.
 */
export type LoginAttempt = { ok: true; userId: string; role: UserRole } | { ok: false };

export async function attemptLogin(db: Database, input: { email: string; password: string; staffOnly: boolean }): Promise<LoginAttempt> {
  const email = normalizeEmail(input.email);
  const password = input.password;
  if (!isPlausibleEmail(email) || password.length === 0 || password.length > MAX_PASSWORD_LENGTH) return { ok: false };

  const [user] = await db
    .select({ id: users.id, role: users.role, isActive: users.isActive, passwordHash: users.passwordHash, lockedUntil: users.lockedUntil })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  if (!user || !user.passwordHash || !user.isActive || isLocked(user.lockedUntil)) {
    await burnPasswordCheck(password);
    return { ok: false };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid || (input.staffOnly && !isStaffRole(user.role))) {
    await registerFailedAttempt(db, user.id);
    return { ok: false };
  }

  await db.batch([
    db.update(users).set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(users.id, user.id)),
    auditInsert(db, { actorUserId: user.id, label: email }, [
      { action: "auth.login", entityType: "user", entityId: user.id, metadata: { area: input.staffOnly ? "admin" : "account" } },
    ]),
  ]);
  return { ok: true, userId: user.id, role: user.role };
}

/** Suma un intento fallido de forma atómica y, al llegar al límite, bloquea la cuenta. */
export async function registerFailedAttempt(db: Database, userId: string): Promise<void> {
  const [updated] = await db
    .update(users)
    .set({
      failedLoginAttempts: sql`${users.failedLoginAttempts} + 1`,
      lockedUntil: sql`case when ${users.failedLoginAttempts} + 1 >= ${MAX_FAILED_LOGIN_ATTEMPTS} then now() + make_interval(mins => ${LOCK_MINUTES}) else ${users.lockedUntil} end`,
    })
    .where(eq(users.id, userId))
    .returning({ attempts: users.failedLoginAttempts });

  if (updated && updated.attempts === MAX_FAILED_LOGIN_ATTEMPTS) {
    await auditInsert(db, { actorUserId: null, label: "sistema" }, [
      { action: "auth.locked", entityType: "user", entityId: userId, metadata: { attempts: updated.attempts, minutes: LOCK_MINUTES } },
    ]);
  }
}
