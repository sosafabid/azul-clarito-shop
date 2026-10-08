import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { users } from "@/db/schema";
import { RATE_LIMITS, TOKEN_TTL_MINUTES, isPlausibleToken } from "@/domain/auth-tokens";
import { isPlausibleEmail, normalizeEmail, validatePassword } from "@/domain/auth";
import { serverConfig } from "@/config/server";
import { hashPassword } from "@/server/auth/password";
import { allowAttempt } from "@/server/auth/throttle";
import { hashToken, issueToken, peekToken } from "@/server/auth/tokens";
import { auditInsert } from "@/server/services/audit";
import { getEmailService } from "@/server/services/email/service";

/**
 * VERIFICACIÓN DE CORREO Y RESTABLECIMIENTO DE CONTRASEÑA.
 *
 * Reglas de seguridad que cumple este módulo:
 *  - Nada de lo que devuelve permite saber si un correo está registrado (las respuestas
 *    públicas son idénticas exista o no la cuenta; el envío real ocurre DESPUÉS de responder).
 *  - Los tokens (ver `auth/tokens.ts`) son de un solo uso, vencen y se guardan hasheados.
 *  - Restablecer la contraseña cierra TODAS las sesiones, quita bloqueos por intentos y
 *    anula los demás enlaces de restablecimiento pendientes.
 *  - Los correos no llevan contraseñas ni datos sensibles, y el token no se escribe en logs.
 */

/** Trabajo diferido (el envío del correo): la acción lo ejecuta con `after()` para no alterar el tiempo de respuesta. */
export type DeferredJob = () => Promise<void>;

function actionUrl(path: string, token: string): string {
  return `${serverConfig.appBaseUrl}${path}?token=${encodeURIComponent(token)}`;
}

async function pause(db: Database): Promise<void> {
  // Una ida y vuelta a la base de datos, para que "no existe la cuenta" no sea notoriamente más rápido.
  await db.execute(sql`select 1`);
}

// ───────────────────────── verificación de correo ─────────────────────────

/** Genera el enlace y devuelve el trabajo que envía el correo de verificación. */
export async function prepareVerificationEmail(db: Database, user: { id: string; email: string; name: string | null }): Promise<DeferredJob> {
  const token = await issueToken(db, user.id, "EMAIL_VERIFICATION");
  const to = user.email;
  const name = user.name;
  return async () => {
    await getEmailService().send({
      event: "email_verification",
      to,
      data: { name, actionUrl: actionUrl("/verify-email", token), expiresHours: TOKEN_TTL_MINUTES.EMAIL_VERIFICATION / 60 },
    });
  };
}

/**
 * Reenvío del correo de verificación (público). Con límites por correo, por IP y una pausa
 * mínima entre envíos. Siempre se responde lo mismo: el llamador muestra `AUTH_MESSAGES.verifyResendGeneric`.
 */
export async function requestVerificationResend(db: Database, rawEmail: string, ip: string): Promise<DeferredJob | null> {
  const email = normalizeEmail(rawEmail);
  if (!isPlausibleEmail(email)) return null;

  const allowed =
    (await allowAttempt(db, "verify-resend:ip", ip, RATE_LIMITS.verifyResendByIp)) &&
    (await allowAttempt(db, "verify-resend:cooldown", email, RATE_LIMITS.verifyResendCooldown)) &&
    (await allowAttempt(db, "verify-resend:email", email, RATE_LIMITS.verifyResendByEmail));
  if (!allowed) return null;

  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, emailVerifiedAt: users.emailVerifiedAt })
    .from(users)
    .where(and(sql`lower(${users.email}) = ${email}`, eq(users.isActive, true)))
    .limit(1);
  if (!user || user.emailVerifiedAt) {
    await pause(db);
    return null;
  }
  return prepareVerificationEmail(db, user);
}

export type ConfirmEmailResult = { ok: true } | { ok: false; code: "invalid" | "throttled" };

/**
 * Confirma el correo con el token del enlace. Una sola sentencia atómica: consume el token
 * Y marca `users.email_verified_at`. Si el enlace ya se usó, venció o no existe → `invalid`.
 */
export async function confirmEmailVerification(db: Database, token: string, ip: string): Promise<ConfirmEmailResult> {
  if (!(await allowAttempt(db, "token-use:ip", ip, RATE_LIMITS.tokenUseByIp))) return { ok: false, code: "throttled" };
  if (!isPlausibleToken(token)) return { ok: false, code: "invalid" };

  const result = await db.execute(sql`
    with consumed as (
      update auth_tokens set used_at = now()
      where token_hash = ${hashToken(token)} and purpose = 'EMAIL_VERIFICATION'
        and used_at is null and expires_at > now()
      returning user_id
    )
    update users set email_verified_at = coalesce(users.email_verified_at, now())
    from consumed
    where users.id = consumed.user_id and users.is_active
    returning users.id as id
  `);
  const userId = (result.rows[0] as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false, code: "invalid" };

  await auditInsert(db, { actorUserId: userId, label: "verificación por correo" }, [
    { action: "account.email_verified", entityType: "user", entityId: userId, metadata: {} },
  ]);
  return { ok: true };
}

// ───────────────────────── restablecer contraseña ─────────────────────────

/**
 * "Olvidé mi contraseña" (público). Devuelve un trabajo de envío SOLO si la cuenta existe y no
 * se superaron los límites; en cualquier otro caso `null`. El llamador responde igual en todos los casos.
 */
export async function requestPasswordReset(db: Database, rawEmail: string, ip: string): Promise<DeferredJob | null> {
  const email = normalizeEmail(rawEmail);
  if (!isPlausibleEmail(email)) return null;

  const allowed = (await allowAttempt(db, "forgot:ip", ip, RATE_LIMITS.forgotByIp)) && (await allowAttempt(db, "forgot:email", email, RATE_LIMITS.forgotByEmail));
  if (!allowed) return null;

  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(and(sql`lower(${users.email}) = ${email}`, eq(users.isActive, true)))
    .limit(1);
  if (!user) {
    await pause(db);
    return null;
  }

  const token = await issueToken(db, user.id, "PASSWORD_RESET");
  await auditInsert(db, { actorUserId: null, label: "sistema" }, [
    { action: "account.password_reset_requested", entityType: "user", entityId: user.id, metadata: {} },
  ]);
  return async () => {
    await getEmailService().send({
      event: "password_reset",
      to: user.email,
      data: { name: user.name, actionUrl: actionUrl("/reset-password", token), expiresMinutes: TOKEN_TTL_MINUTES.PASSWORD_RESET },
    });
  };
}

/** ¿El enlace de restablecimiento sirve todavía? (no lo consume). */
export async function isResetTokenValid(db: Database, token: string): Promise<boolean> {
  return (await peekToken(db, token, "PASSWORD_RESET")) !== null;
}

export type ResetResult =
  | { ok: true; notify: DeferredJob }
  | { ok: false; code: "invalid" | "throttled" }
  | { ok: false; code: "weak"; message: string };

/**
 * Guarda la contraseña nueva usando el token. Una sola sentencia atómica: consume el token,
 * cambia el hash, quita bloqueos, marca el correo como verificado (ya demostró tenerlo),
 * CIERRA TODAS LAS SESIONES y anula los demás enlaces de restablecimiento pendientes.
 */
export async function resetPassword(db: Database, input: { token: string; password: string }, ip: string): Promise<ResetResult> {
  if (!(await allowAttempt(db, "token-use:ip", ip, RATE_LIMITS.tokenUseByIp))) return { ok: false, code: "throttled" };

  const peeked = await peekToken(db, input.token, "PASSWORD_RESET");
  if (!peeked) return { ok: false, code: "invalid" };

  const problem = validatePassword(input.password, peeked.email);
  if (problem) return { ok: false, code: "weak", message: problem };

  const passwordHash = await hashPassword(input.password);
  const result = await db.execute(sql`
    with consumed as (
      update auth_tokens set used_at = now()
      where token_hash = ${hashToken(input.token)} and purpose = 'PASSWORD_RESET'
        and used_at is null and expires_at > now()
      returning user_id
    ),
    changed as (
      update users
      set password_hash = ${passwordHash}, failed_login_attempts = 0, locked_until = null,
          email_verified_at = coalesce(users.email_verified_at, now()), updated_at = now()
      from consumed
      where users.id = consumed.user_id and users.is_active
      returning users.id as id
    ),
    closed_sessions as (
      delete from sessions where user_id in (select id from changed)
    ),
    other_tokens as (
      delete from auth_tokens
      where user_id in (select id from changed) and purpose = 'PASSWORD_RESET' and used_at is null
        and token_hash <> ${hashToken(input.token)}
    )
    select id from changed
  `);
  const userId = (result.rows[0] as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false, code: "invalid" };

  await auditInsert(db, { actorUserId: userId, label: "restablecimiento por correo" }, [
    { action: "account.password_reset", entityType: "user", entityId: userId, metadata: { allSessionsClosed: true } },
  ]);
  return {
    ok: true,
    notify: async () => {
      await getEmailService().send({ event: "password_changed", to: peeked.email, data: { name: peeked.name } });
    },
  };
}
