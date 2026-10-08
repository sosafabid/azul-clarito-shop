"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { routes } from "@/config/routes";
import { legalConfig } from "@/config/legal";
import { getDb, isDatabaseConfigured } from "@/db";
import { parsePasswordChange, parseProfileForm } from "@/domain/customer-form";
import { endSession, getCurrentTokenHash, requireUser } from "@/server/auth";
import { getEmailService } from "@/server/services/email/service";
import { changePassword, deleteAccount, getAccountOverview, setMarketingConsent, updateProfile } from "@/server/services/accounts";

/**
 * ACCIONES DE LA CUENTA (requieren sesión). Cada una empieza con `requireUser()` y
 * opera SIEMPRE sobre la cuenta de la sesión: ninguna recibe un id de usuario desde
 * el formulario, así que nadie puede tocar la cuenta de otra persona.
 */
export type AccountFormState = { errors: Record<string, string>; message?: string; ok?: boolean } | null;

const NO_DB: AccountFormState = { errors: {}, message: "La base de datos no está configurada (falta DATABASE_URL)." };

function record(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) if (typeof value === "string") out[key] = value;
  return out;
}

export async function updateProfileAction(_previous: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const session = await requireUser();
  if (!isDatabaseConfigured()) return NO_DB;
  const parsed = parseProfileForm(record(formData));
  if (!parsed.ok) return { errors: parsed.errors };
  await updateProfile(getDb(), session.userId, parsed.data);
  revalidatePath(routes.account);
  return { errors: {}, ok: true, message: "Datos guardados." };
}

/** Acepta o retira el consentimiento de comunicaciones comerciales (siempre se puede retirar). */
export async function setMarketingAction(_previous: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const session = await requireUser();
  if (!isDatabaseConfigured()) return NO_DB;
  const wants = formData.get("marketing") === "on";
  const overview = await getAccountOverview(getDb(), session.userId);
  if (!overview) return { errors: {}, message: "No encontramos tu cuenta." };

  if ((overview.consents.MARKETING?.granted ?? false) !== wants) {
    await setMarketingConsent(getDb(), session.userId, wants, legalConfig.privacyVersion);
  }
  revalidatePath(routes.account);
  return { errors: {}, ok: true, message: wants ? "Listo: vas a recibir nuestras novedades." : "Listo: no vas a recibir comunicaciones comerciales." };
}

export async function changePasswordAction(_previous: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const session = await requireUser();
  if (!isDatabaseConfigured()) return NO_DB;
  const parsed = parsePasswordChange(record(formData), session.email);
  if (!parsed.ok) return { errors: parsed.errors };

  const result = await changePassword(getDb(), session.userId, parsed.data, await getCurrentTokenHash());
  if (!result.ok) {
    if (result.code === "locked") return { errors: {}, message: "La cuenta está bloqueada temporalmente por intentos fallidos. Probá de nuevo en unos minutos." };
    return { errors: { currentPassword: "La contraseña actual no es correcta." } };
  }
  // Aviso de seguridad por correo (sin contraseñas), después de responder.
  after(async () => {
    await getEmailService().send({ event: "password_changed", to: session.email, data: { name: session.name } });
  });
  return { errors: {}, ok: true, message: "Contraseña actualizada. Cerramos tus otras sesiones abiertas." };
}

export async function deleteAccountAction(_previous: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const session = await requireUser();
  if (!isDatabaseConfigured()) return NO_DB;
  if (formData.get("understand") !== "on") return { errors: {}, message: "Marcá la casilla para confirmar que entendés que es definitivo." };

  const result = await deleteAccount(getDb(), session.userId, String(formData.get("password") ?? ""));
  if (!result.ok) {
    if (result.code === "staff_account") return { errors: {}, message: "Las cuentas del equipo no se eliminan desde acá. Pedile a otra persona SUPER_ADMIN que lo haga." };
    if (result.code === "locked") return { errors: {}, message: "La cuenta está bloqueada temporalmente por intentos fallidos. Probá de nuevo en unos minutos." };
    return { errors: { password: "La contraseña no es correcta." } };
  }
  await endSession();
  redirect(`${routes.accountLogin}?eliminada=1`);
}
