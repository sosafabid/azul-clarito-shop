import "server-only";
import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { auditLogs, sessions, userConsents, users } from "@/db/schema";
import { currentConsents, type ConsentEvent, type ConsentType, type CurrentConsent } from "@/domain/consent";
import type { ParsedRegistration } from "@/domain/customer-form";
import { isLocked } from "@/domain/auth";
import { isStaffRole, type UserRole } from "@/domain/roles";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { auditInsert } from "@/server/services/audit";
import { registerFailedAttempt } from "@/server/services/auth/login";
import { uniqueViolationConstraint } from "@/server/services/catalog/admin";

/**
 * CUENTAS DE CLIENTAS: registro, perfil, consentimientos, contraseña y eliminación.
 * Maneja datos personales: solo se usa desde Server Actions y páginas de /account,
 * siempre sobre la cuenta de la persona con sesión iniciada.
 */
const MAX_REGISTRATIONS_PER_10_MIN = 20;

export type RegisterResult =
  | { ok: true; userId: string }
  | { ok: false; code: "email_taken" | "throttled"; message: string };

export async function registerCustomer(
  db: Database,
  data: ParsedRegistration,
  versions: { terms: string; privacy: string },
): Promise<RegisterResult> {
  // Tope global de registros (freno básico contra creación masiva de cuentas).
  const [recent] = await db
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.role, "CUSTOMER"), sql`${users.createdAt} > now() - interval '10 minutes'`));
  if ((recent?.n ?? 0) >= MAX_REGISTRATIONS_PER_10_MIN) {
    return { ok: false, code: "throttled", message: "Estamos recibiendo muchas solicitudes. Intentá de nuevo en unos minutos." };
  }

  // El hash se calcula SIEMPRE antes de mirar si el correo existe: así el tiempo de respuesta no lo delata.
  const passwordHash = await hashPassword(data.password);

  const [existing] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${data.email}`).limit(1);
  if (existing) return { ok: false, code: "email_taken", message: "Ya existe una cuenta con ese correo." };

  const id = crypto.randomUUID();
  try {
    await db.batch([
      db.insert(users).values({ id, email: data.email, name: data.name, phone: data.phone, role: "CUSTOMER", passwordHash, isActive: true }),
      db.insert(userConsents).values([
        { userId: id, type: "TERMS", version: versions.terms, granted: true, source: "registration" },
        { userId: id, type: "PRIVACY", version: versions.privacy, granted: true, source: "registration" },
        // La elección sobre marketing se guarda siempre (aceptada o rechazada): queda constancia de que se ofreció.
        { userId: id, type: "MARKETING", version: versions.privacy, granted: data.marketing, source: "registration" },
      ]),
      auditInsert(db, { actorUserId: id, label: data.email }, [
        { action: "account.registered", entityType: "user", entityId: id, metadata: { termsVersion: versions.terms, privacyVersion: versions.privacy, marketing: data.marketing } },
      ]),
    ]);
    return { ok: true, userId: id };
  } catch (error) {
    if (uniqueViolationConstraint(error) !== null) return { ok: false, code: "email_taken", message: "Ya existe una cuenta con ese correo." };
    throw error;
  }
}

export type AccountOverview = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: UserRole;
  createdAt: Date;
  emailVerifiedAt: Date | null;
  consents: Partial<Record<ConsentType, CurrentConsent>>;
  history: ConsentEvent[];
};

/** Todo lo que la tienda guarda de la persona (derecho de acceso). */
export async function getAccountOverview(db: Database, userId: string): Promise<AccountOverview | null> {
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, phone: users.phone, role: users.role, createdAt: users.createdAt, emailVerifiedAt: users.emailVerifiedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return null;

  const history = await db
    .select({ type: userConsents.type, version: userConsents.version, granted: userConsents.granted, createdAt: userConsents.createdAt })
    .from(userConsents)
    .where(eq(userConsents.userId, userId))
    .orderBy(desc(userConsents.createdAt));

  return { ...user, consents: currentConsents(history), history };
}

export async function updateProfile(db: Database, userId: string, data: { name: string; phone: string | null }): Promise<void> {
  const [current] = await db.select({ name: users.name, phone: users.phone }).from(users).where(eq(users.id, userId)).limit(1);
  if (!current) return;
  const fields: string[] = [];
  if (current.name !== data.name) fields.push("name");
  if (current.phone !== data.phone) fields.push("phone");
  if (fields.length === 0) return;

  // En la auditoría solo se anota QUÉ campos cambiaron, no sus valores.
  await db.batch([
    db.update(users).set({ name: data.name, phone: data.phone }).where(eq(users.id, userId)),
    auditInsert(db, { actorUserId: userId, label: "cuenta propia" }, [
      { action: "account.profile_updated", entityType: "user", entityId: userId, metadata: { fields } },
    ]),
  ]);
}

/** Registra un cambio en el consentimiento de marketing (acepta o retira) como un evento nuevo. */
export async function setMarketingConsent(db: Database, userId: string, granted: boolean, version: string): Promise<void> {
  await db.batch([
    db.insert(userConsents).values({ userId, type: "MARKETING", version, granted, source: "account" }),
    auditInsert(db, { actorUserId: userId, label: "cuenta propia" }, [
      { action: "account.consent_changed", entityType: "user", entityId: userId, metadata: { type: "MARKETING", granted } },
    ]),
  ]);
}

export type PasswordResult = { ok: true } | { ok: false; code: "wrong_password" | "locked" | "not_found" };

/** Verifica la contraseña actual de una cuenta que YA tiene sesión (con el mismo bloqueo por intentos). */
async function checkCurrentPassword(db: Database, userId: string, password: string) {
  const [user] = await db
    .select({ passwordHash: users.passwordHash, role: users.role, lockedUntil: users.lockedUntil })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || !user.passwordHash) return { ok: false as const, code: "not_found" as const };
  if (isLocked(user.lockedUntil)) return { ok: false as const, code: "locked" as const };
  if (!(await verifyPassword(password, user.passwordHash))) {
    await registerFailedAttempt(db, userId);
    return { ok: false as const, code: "wrong_password" as const };
  }
  return { ok: true as const, role: user.role };
}

/** Cambia la contraseña y cierra TODAS las demás sesiones (la actual se conserva). */
export async function changePassword(
  db: Database,
  userId: string,
  input: { current: string; next: string },
  keepTokenHash: string | null,
): Promise<PasswordResult> {
  const check = await checkCurrentPassword(db, userId, input.current);
  if (!check.ok) return check;

  const passwordHash = await hashPassword(input.next);
  await db.batch([
    db.update(users).set({ passwordHash, failedLoginAttempts: 0, lockedUntil: null }).where(eq(users.id, userId)),
    db.delete(sessions).where(keepTokenHash ? and(eq(sessions.userId, userId), ne(sessions.tokenHash, keepTokenHash)) : eq(sessions.userId, userId)),
    auditInsert(db, { actorUserId: userId, label: "cuenta propia" }, [
      { action: "account.password_changed", entityType: "user", entityId: userId, metadata: { otherSessionsClosed: true } },
    ]),
  ]);
  return { ok: true };
}

export type DeleteAccountResult = PasswordResult | { ok: false; code: "staff_account" };

/**
 * Elimina la cuenta DEFINITIVAMENTE (derecho de cancelación): se borran la persona,
 * sus sesiones, direcciones y consentimientos. Los pedidos no se borran (se
 * conservan sin vínculo a la cuenta). En la auditoría queda el hecho, pero se
 * quita el correo de los registros anteriores. Las cuentas del equipo no se
 * eliminan desde acá (evita quedarse sin administradores por accidente).
 */
export async function deleteAccount(db: Database, userId: string, password: string): Promise<DeleteAccountResult> {
  const check = await checkCurrentPassword(db, userId, password);
  if (!check.ok) return check;
  if (isStaffRole(check.role)) return { ok: false, code: "staff_account" };

  await db.batch([
    db
      .update(auditLogs)
      .set({ metadata: sql`coalesce(${auditLogs.metadata}, '{}'::jsonb) - 'actor'` })
      .where(eq(auditLogs.actorUserId, userId)),
    // Los registros sobre ESTA cuenta (cambios de rol) tampoco conservan su correo ni quién actuó con su nombre.
    db
      .update(auditLogs)
      .set({ metadata: sql`coalesce(${auditLogs.metadata}, '{}'::jsonb) - 'targetEmail'` })
      .where(and(eq(auditLogs.entityType, "user"), eq(auditLogs.entityId, userId))),
    auditInsert(db, { actorUserId: null, label: "cuenta eliminada" }, [
      { action: "account.deleted", entityType: "user", entityId: userId, metadata: {} },
    ]),
    db.delete(users).where(eq(users.id, userId)),
  ]);
  return { ok: true };
}
