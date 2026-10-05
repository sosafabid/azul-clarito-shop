"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { users } from "@/db/schema";
import {
  LOCK_MINUTES,
  MAX_FAILED_LOGIN_ATTEMPTS,
  MAX_PASSWORD_LENGTH,
  isLocked,
  isPlausibleEmail,
  normalizeEmail,
} from "@/domain/auth";
import { isStaffRole } from "@/domain/roles";
import { burnPasswordCheck, verifyPassword } from "@/server/auth/password";
import { endSession, startSession } from "@/server/auth/session";
import { auditInsert } from "@/server/services/audit";

/**
 * INICIO Y CIERRE DE SESIÓN.
 *
 * Estas dos acciones son las ÚNICAS públicas del panel (por naturaleza no
 * pueden exigir sesión). No reciben ningún rol ni permiso desde el formulario:
 * el rol siempre se lee de la base de datos.
 *
 * Protecciones: mensaje de error genérico (no revela si el correo existe),
 * tiempo equilibrado con un hash ficticio, bloqueo temporal tras varios
 * intentos fallidos, y solo el equipo (STAFF / SUPER_ADMIN) puede entrar.
 */
export type LoginState = { message: string } | null;

const GENERIC_FAILURE: LoginState = { message: "Correo o contraseña incorrectos, o la cuenta está bloqueada temporalmente." };

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  if (!isDatabaseConfigured()) return { message: "La base de datos no está configurada (falta DATABASE_URL)." };

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!isPlausibleEmail(email) || password.length === 0 || password.length > MAX_PASSWORD_LENGTH) return GENERIC_FAILURE;

  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      role: users.role,
      isActive: users.isActive,
      passwordHash: users.passwordHash,
      lockedUntil: users.lockedUntil,
    })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  if (!user || !user.passwordHash || !user.isActive || isLocked(user.lockedUntil)) {
    await burnPasswordCheck(password); // mismo tiempo de respuesta que un intento real
    return GENERIC_FAILURE;
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid || !isStaffRole(user.role)) {
    // Incremento atómico en la base (no leer-y-escribir) para que intentos simultáneos cuenten todos.
    const [updated] = await db
      .update(users)
      .set({
        failedLoginAttempts: sql`${users.failedLoginAttempts} + 1`,
        lockedUntil: sql`case when ${users.failedLoginAttempts} + 1 >= ${MAX_FAILED_LOGIN_ATTEMPTS} then now() + make_interval(mins => ${LOCK_MINUTES}) else ${users.lockedUntil} end`,
      })
      .where(eq(users.id, user.id))
      .returning({ attempts: users.failedLoginAttempts });

    if (updated && updated.attempts === MAX_FAILED_LOGIN_ATTEMPTS) {
      await auditInsert(db, { actorUserId: null, label: "sistema" }, [
        { action: "auth.locked", entityType: "user", entityId: user.id, metadata: { attempts: updated.attempts, minutes: LOCK_MINUTES } },
      ]);
    }
    return GENERIC_FAILURE;
  }

  await db.batch([
    db.update(users).set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(users.id, user.id)),
    auditInsert(db, { actorUserId: user.id, label: email }, [
      { action: "auth.login", entityType: "user", entityId: user.id, metadata: {} },
    ]),
  ]);
  await startSession(user.id);
  redirect(routes.admin);
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect(routes.adminLogin);
}
