"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { AUTH_MESSAGES } from "@/domain/auth-tokens";
import { MAX_PASSWORD_LENGTH } from "@/domain/auth";
import { getSession } from "@/server/auth";
import { clientIp } from "@/server/auth/throttle";
import { confirmEmailVerification, requestPasswordReset, requestVerificationResend, resetPassword } from "@/server/services/auth/recovery";

/**
 * ACCIONES PÚBLICAS DE RECUPERACIÓN: olvidé mi contraseña, restablecerla, confirmar el
 * correo y reenviar la verificación. Por naturaleza no exigen sesión (la persona no puede
 * ingresar), así que su protección es: tokens de un solo uso con vencimiento, límites de
 * frecuencia y respuestas que NO revelan si un correo está registrado.
 *
 * Ninguna recibe un id de usuario ni un rol desde el formulario: la cuenta siempre se
 * deduce del token (o de la sesión) en el servidor.
 */
export type RecoveryState = { message?: string; ok?: boolean; errors?: Record<string, string>; invalidLink?: boolean } | null;

const NO_DB = "La base de datos no está configurada (falta DATABASE_URL).";

/** "Olvidé mi contraseña": respuesta SIEMPRE igual; el correo se envía después de responder. */
export async function forgotPasswordAction(_previous: RecoveryState, formData: FormData): Promise<RecoveryState> {
  if (!isDatabaseConfigured()) return { message: NO_DB };
  // Campo trampa para bots.
  if (String(formData.get("website") ?? "") !== "") return { ok: true, message: AUTH_MESSAGES.forgotGeneric };

  const job = await requestPasswordReset(getDb(), String(formData.get("email") ?? "").slice(0, 320), await clientIp());
  if (job) after(job);
  return { ok: true, message: AUTH_MESSAGES.forgotGeneric };
}

/** Define la contraseña nueva a partir del enlace del correo. */
export async function resetPasswordAction(_previous: RecoveryState, formData: FormData): Promise<RecoveryState> {
  if (!isDatabaseConfigured()) return { message: NO_DB };
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("newPasswordConfirm") ?? "");

  if (password.length > MAX_PASSWORD_LENGTH) return { errors: { newPassword: "La contraseña es demasiado larga." } };
  if (password !== confirm) return { errors: { newPasswordConfirm: "Las contraseñas no coinciden." } };

  const result = await resetPassword(getDb(), { token, password }, await clientIp());
  if (!result.ok) {
    if (result.code === "weak") return { errors: { newPassword: result.message } };
    if (result.code === "throttled") return { message: AUTH_MESSAGES.tooMany };
    return { invalidLink: true, message: AUTH_MESSAGES.invalidLink };
  }
  after(result.notify);
  redirect(routes.resetSuccess);
}

/** Confirma el correo (el enlace del correo abre una página con un botón que ejecuta esta acción). */
export async function confirmEmailAction(_previous: RecoveryState, formData: FormData): Promise<RecoveryState> {
  if (!isDatabaseConfigured()) return { message: NO_DB };
  const result = await confirmEmailVerification(getDb(), String(formData.get("token") ?? ""), await clientIp());
  if (!result.ok) {
    if (result.code === "throttled") return { message: AUTH_MESSAGES.tooMany };
    return { invalidLink: true, message: AUTH_MESSAGES.invalidLink };
  }
  redirect(routes.verificationSuccess);
}

/**
 * Reenvía el correo de verificación. Si hay sesión se usa SU correo (no el del formulario);
 * si no, el que escribió la persona. En ambos casos la respuesta es la misma.
 */
export async function resendVerificationAction(_previous: RecoveryState, formData: FormData): Promise<RecoveryState> {
  if (!isDatabaseConfigured()) return { message: NO_DB };
  const session = await getSession();
  const email = session ? session.email : String(formData.get("email") ?? "").slice(0, 320);
  const job = await requestVerificationResend(getDb(), email, await clientIp());
  if (job) after(job);
  return { ok: true, message: AUTH_MESSAGES.verifyResendGeneric };
}
