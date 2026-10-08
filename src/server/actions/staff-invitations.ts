"use server";

import { redirect } from "next/navigation";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { MAX_PASSWORD_LENGTH } from "@/domain/auth";
import { clientIp } from "@/server/auth/throttle";
import { acceptInvitation } from "@/server/services/users/invitations";

/**
 * ACEPTAR UNA INVITACIÓN A STAFF (pública por naturaleza: la persona aún no tiene cuenta).
 * Su protección es el token de un solo uso del correo. Del formulario NO se lee ningún rol:
 * el rol STAFF lo fija el servidor al consumir una invitación válida.
 */
export type AcceptInvitationState = { message?: string; errors?: Record<string, string>; invalidLink?: boolean } | null;

export async function acceptInvitationAction(_previous: AcceptInvitationState, formData: FormData): Promise<AcceptInvitationState> {
  if (!isDatabaseConfigured()) return { message: "La base de datos no está configurada (falta DATABASE_URL)." };
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("passwordConfirm") ?? "");
  if (password.length > MAX_PASSWORD_LENGTH) return { errors: { password: "La contraseña es demasiado larga." } };
  if (password !== confirm) return { errors: { passwordConfirm: "Las contraseñas no coinciden." } };

  const result = await acceptInvitation(
    getDb(),
    { token: String(formData.get("token") ?? ""), name: String(formData.get("name") ?? ""), password },
    await clientIp(),
  );
  if (!result.ok) {
    if (result.code === "weak") return { errors: { password: result.message } };
    if (result.code === "invalid_name") return { errors: { name: result.message } };
    if (result.code === "throttled") return { message: result.message };
    return { invalidLink: true, message: result.message };
  }
  // Sin iniciar sesión aquí: la persona ingresa por el login con la contraseña que acaba de crear.
  redirect(`${routes.adminLogin}?invitacion=aceptada`);
}
