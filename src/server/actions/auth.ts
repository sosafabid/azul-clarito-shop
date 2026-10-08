"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { routes } from "@/config/routes";
import { legalConfig } from "@/config/legal";
import { getDb, isDatabaseConfigured } from "@/db";
import { parseRegistrationForm } from "@/domain/customer-form";
import { endSession, startSession } from "@/server/auth";
import { attemptLogin } from "@/server/services/auth/login";
import { registerCustomer } from "@/server/services/accounts";
import { prepareVerificationEmail } from "@/server/services/auth/recovery";
import { mergeCartOnLogin } from "@/server/services/cart/request";

/**
 * ACCIONES PÚBLICAS DE SESIÓN: ingresar (equipo y clientas), registrarse y salir.
 *
 * Son las ÚNICAS acciones que por naturaleza no exigen sesión. Ninguna recibe un
 * rol ni un permiso desde el formulario: el rol de una cuenta nueva es SIEMPRE
 * CUSTOMER y el de una existente se lee de la base de datos.
 */
export type LoginState = { message: string } | null;
export type RegisterState = { errors: Record<string, string>; message?: string } | null;

const GENERIC_FAILURE: LoginState = { message: "Correo o contraseña incorrectos, o la cuenta está bloqueada temporalmente." };
const NO_DB = "La base de datos no está configurada (falta DATABASE_URL).";

/** Ingreso al PANEL: solo STAFF y SUPER_ADMIN. */
export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  if (!isDatabaseConfigured()) return { message: NO_DB };
  const result = await attemptLogin(getDb(), {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    staffOnly: true,
  });
  if (!result.ok) return GENERIC_FAILURE;
  await startSession(result.userId);
  await mergeCartOnLogin(result.userId); // el carrito de invitada se conserva y se fusiona
  redirect(routes.admin);
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect(routes.adminLogin);
}

/** Ingreso a la CUENTA de la tienda (cualquier persona con cuenta activa). */
export async function customerLoginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  if (!isDatabaseConfigured()) return { message: NO_DB };
  const result = await attemptLogin(getDb(), {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    staffOnly: false,
  });
  if (!result.ok) return GENERIC_FAILURE;
  await startSession(result.userId);
  await mergeCartOnLogin(result.userId); // el carrito de invitada se conserva y se fusiona
  redirect(routes.account);
}

export async function customerLogoutAction(): Promise<void> {
  await endSession();
  redirect(routes.home);
}

/**
 * Registro de una clienta nueva. Los consentimientos obligatorios se exigen en el
 * servidor (`parseRegistrationForm`) y cada uno se guarda como evento con la
 * versión del texto legal vigente.
 */
export async function registerAction(_previous: RegisterState, formData: FormData): Promise<RegisterState> {
  if (!isDatabaseConfigured()) return { errors: {}, message: NO_DB };

  // Campo trampa para bots: una persona real no lo ve ni lo llena.
  if (String(formData.get("website") ?? "") !== "") return { errors: {}, message: "No pudimos crear la cuenta. Intentá de nuevo." };

  const record: Record<string, string> = {};
  for (const [key, value] of formData.entries()) if (typeof value === "string") record[key] = value;

  const parsed = parseRegistrationForm(record);
  if (!parsed.ok) return { errors: parsed.errors };

  const result = await registerCustomer(getDb(), parsed.data, { terms: legalConfig.termsVersion, privacy: legalConfig.privacyVersion });
  if (!result.ok) {
    if (result.code === "email_taken") {
      return { errors: { email: "Ya existe una cuenta con ese correo. Ingresá con tu contraseña." }, message: result.message };
    }
    return { errors: {}, message: result.message };
  }

  // Correo de verificación (de marca, vía Resend). Si el envío falla, la cuenta igual queda creada:
  // desde la cuenta se puede pedir un reenvío. Se envía DESPUÉS de responder.
  try {
    after(await prepareVerificationEmail(getDb(), { id: result.userId, email: parsed.data.email, name: parsed.data.name }));
  } catch (error) {
    console.error("[auth] No se pudo preparar el correo de verificación:", error instanceof Error ? error.name : "error");
  }

  await startSession(result.userId);
  await mergeCartOnLogin(result.userId); // el carrito de invitada se conserva y se fusiona
  redirect(routes.verifyEmail);
}
