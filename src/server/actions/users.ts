"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { routes } from "@/config/routes";
import { getDb } from "@/db";
import { isUuid } from "@/domain/ids";
import { requirePermission } from "@/server/auth/guards";
import { resolveAuditActor } from "@/server/services/audit";
import { changeUserRole, setStaffAccess } from "@/server/services/users/admin";
import { inviteStaff, revokeInvitation } from "@/server/services/users/invitations";

/**
 * ACCIONES DE "USUARIOS Y ROLES". Todas exigen `users:manage-roles` / `users:invite` EN EL SERVIDOR.
 * La persona que actúa sale SIEMPRE de la sesión; del formulario solo llegan el id de la cuenta
 * afectada y la acción pedida, y el servicio las vuelve a validar.
 */
export type UserActionState = { ok?: boolean; message?: string } | null;

function str(formData: FormData, key: string, max = 100): string {
  return String(formData.get(key) ?? "").slice(0, max);
}

export async function changeRoleAction(_previous: UserActionState, formData: FormData): Promise<UserActionState> {
  const session = await requirePermission("users:manage-roles");
  const targetId = str(formData, "userId");
  if (!isUuid(targetId)) return { message: "Cuenta no válida." };
  const newRole = str(formData, "role", 20);
  // Retirar privilegios exige confirmación explícita (también se comprueba aquí, no solo en el formulario).
  if (newRole === "CUSTOMER" && str(formData, "confirm", 5) !== "yes") return { message: "Confirmá que querés retirar el acceso al panel." };
  const result = await changeUserRole(getDb(), { id: session.userId, role: session.role }, resolveAuditActor(session), targetId, newRole);
  if (!result.ok) return { message: result.message };
  revalidatePath(routes.adminUsers);
  // Tras el cambio el formulario cambia de forma (p. ej. de "asignar" a "retirar"), así que el aviso viaja en la URL.
  redirect(`${routes.adminUser(targetId)}?cambio=${newRole === "STAFF" ? "asignado" : "retirado"}`);
}

export async function setStaffAccessAction(_previous: UserActionState, formData: FormData): Promise<UserActionState> {
  const session = await requirePermission("users:manage-roles");
  const targetId = str(formData, "userId");
  if (!isUuid(targetId)) return { message: "Cuenta no válida." };
  const suspend = str(formData, "intent", 12) === "suspend";
  if (suspend && str(formData, "confirm", 5) !== "yes") return { message: "Confirmá que querés suspender el acceso." };
  const result = await setStaffAccess(getDb(), { id: session.userId, role: session.role }, resolveAuditActor(session), targetId, suspend);
  if (!result.ok) return { message: result.message };
  revalidatePath(routes.adminUsers);
  redirect(`${routes.adminUser(targetId)}?cambio=${suspend ? "suspendido" : "reactivado"}`);
}

export async function inviteStaffAction(_previous: UserActionState, formData: FormData): Promise<UserActionState> {
  const session = await requirePermission("users:invite");
  const result = await inviteStaff(getDb(), { id: session.userId, role: session.role }, resolveAuditActor(session), session.name ?? null, str(formData, "email", 320));
  if (!result.ok) return { message: result.message };
  after(result.job);
  revalidatePath(routes.adminUsers);
  return { ok: true, message: "Invitación enviada. Vence en 72 horas." };
}

export async function revokeInvitationAction(_previous: UserActionState, formData: FormData): Promise<UserActionState> {
  const session = await requirePermission("users:invite");
  const id = str(formData, "invitationId");
  if (!isUuid(id)) return { message: "Invitación no válida." };
  const ok = await revokeInvitation(getDb(), { id: session.userId, role: session.role }, resolveAuditActor(session), id);
  revalidatePath(routes.adminUsers);
  return ok ? { ok: true, message: "Invitación revocada." } : { message: "Esa invitación ya no está pendiente." };
}
