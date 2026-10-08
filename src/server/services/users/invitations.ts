import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { staffInvitations, users } from "@/db/schema";
import { isPlausibleEmail, normalizeEmail, validatePassword } from "@/domain/auth";
import { isPlausibleToken } from "@/domain/auth-tokens";
import { MAX_INVITATIONS_PER_HOUR, STAFF_INVITATION_TTL_HOURS, type Actor } from "@/domain/user-admin";
import { serverConfig } from "@/config/server";
import { hashPassword } from "@/server/auth/password";
import { allowAttempt } from "@/server/auth/throttle";
import { hashToken } from "@/server/auth/tokens";
import { auditInsert, type AuditActor } from "@/server/services/audit";
import { getEmailService } from "@/server/services/email/service";

/**
 * INVITACIONES A STAFF.
 *
 *  - Solo SUPER_ADMIN invita (el llamador valida `users:invite` en el servidor y pasa el actor de la sesión).
 *  - Se invita únicamente a correos SIN cuenta: si ya existe una cuenta (p. ej. CUSTOMER), el rol se
 *    asigna explícitamente desde "Usuarios y roles". Así nunca hay dos usuarios con el mismo correo.
 *  - El token es aleatorio (256 bits); en la base solo se guarda su sha256. Vence a las 72 h,
 *    se acepta una sola vez (UPDATE atómico) y se puede revocar.
 *  - El rol STAFF se asigna ÚNICAMENTE aquí, al aceptar una invitación válida: el rol no viene del navegador.
 *  - La persona que acepta demuestra que controla el correo (recibió el enlace), por eso su cuenta nace verificada.
 */
export type DeferredJob = () => Promise<void>;

export type InviteResult =
  | { ok: true; job: DeferredJob }
  | { ok: false; code: "invalid_email" | "account_exists" | "throttled" | "forbidden"; message: string };

export async function inviteStaff(db: Database, actor: Actor, auditActor: AuditActor, inviterName: string | null, rawEmail: string): Promise<InviteResult> {
  if (actor.role !== "SUPER_ADMIN") return { ok: false, code: "forbidden", message: "Solo una persona SUPER_ADMIN puede invitar." };
  const email = normalizeEmail(rawEmail.slice(0, 320));
  if (!isPlausibleEmail(email)) return { ok: false, code: "invalid_email", message: "Escribí un correo válido." };

  const [existing] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
  if (existing) {
    return {
      ok: false,
      code: "account_exists",
      message: "Ese correo ya tiene una cuenta. Buscala en la lista y asignale el rol STAFF desde su ficha.",
    };
  }
  if (!(await allowAttempt(db, "staff_invite", actor.id, { max: MAX_INVITATIONS_PER_HOUR, windowSeconds: 3600 }))) {
    return { ok: false, code: "throttled", message: "Enviaste muchas invitaciones. Esperá un rato antes de seguir." };
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + STAFF_INVITATION_TTL_HOURS * 3600 * 1000);
  const [row] = await db.batch([
    // Una invitación nueva anula las pendientes anteriores del mismo correo.
    db
      .update(staffInvitations)
      .set({ revokedAt: new Date() })
      .where(and(sql`lower(${staffInvitations.email}) = ${email}`, isNull(staffInvitations.acceptedAt), isNull(staffInvitations.revokedAt))),
    db.insert(staffInvitations).values({ email, tokenHash: hashToken(token), invitedBy: actor.id, expiresAt }).returning({ id: staffInvitations.id }),
    auditInsert(db, auditActor, [
      { action: "staff_invited", entityType: "staff_invitation", entityId: email, metadata: { result: "success", targetEmail: email, newRole: "STAFF", expiresAt: expiresAt.toISOString() } },
    ]),
  ]);
  void row;

  const job: DeferredJob = async () => {
    await getEmailService().send({
      event: "staff_invitation",
      to: email,
      data: { actionUrl: `${serverConfig.appBaseUrl}/staff-invitation?token=${encodeURIComponent(token)}`, expiresHours: STAFF_INVITATION_TTL_HOURS, invitedByName: inviterName },
    });
  };
  return { ok: true, job };
}

export type PendingInvitation = { id: string; email: string; createdAt: Date; expiresAt: Date; invitedByName: string | null };

export async function listPendingInvitations(db: Database): Promise<PendingInvitation[]> {
  return db
    .select({
      id: staffInvitations.id,
      email: staffInvitations.email,
      createdAt: staffInvitations.createdAt,
      expiresAt: staffInvitations.expiresAt,
      invitedByName: users.name,
    })
    .from(staffInvitations)
    .leftJoin(users, eq(users.id, staffInvitations.invitedBy))
    .where(and(isNull(staffInvitations.acceptedAt), isNull(staffInvitations.revokedAt), gt(staffInvitations.expiresAt, new Date())))
    .orderBy(desc(staffInvitations.createdAt))
    .limit(100);
}

export async function revokeInvitation(db: Database, actor: Actor, auditActor: AuditActor, invitationId: string): Promise<boolean> {
  if (actor.role !== "SUPER_ADMIN") return false;
  const rows = await db
    .update(staffInvitations)
    .set({ revokedAt: new Date() })
    .where(and(eq(staffInvitations.id, invitationId), isNull(staffInvitations.acceptedAt), isNull(staffInvitations.revokedAt)))
    .returning({ email: staffInvitations.email });
  const row = rows[0];
  if (!row) return false;
  await auditInsert(db, auditActor, [
    { action: "staff_invitation_revoked", entityType: "staff_invitation", entityId: row.email, metadata: { result: "success", targetEmail: row.email } },
  ]);
  return true;
}

/** Mira si una invitación sirve SIN consumirla. Devuelve el correo invitado (para mostrarlo), o null. */
export async function peekInvitation(db: Database, token: string): Promise<{ email: string } | null> {
  if (!isPlausibleToken(token)) return null;
  const [row] = await db
    .select({ email: staffInvitations.email })
    .from(staffInvitations)
    .where(
      and(
        eq(staffInvitations.tokenHash, hashToken(token)),
        isNull(staffInvitations.acceptedAt),
        isNull(staffInvitations.revokedAt),
        gt(staffInvitations.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row ?? null;
}

export type AcceptResult =
  | { ok: true; userId: string }
  | { ok: false; code: "invalid" | "throttled" | "weak" | "invalid_name"; message: string };

/**
 * Acepta la invitación: en UNA sentencia consume la invitación (solo si sigue vigente y el correo
 * sigue sin cuenta), crea la cuenta STAFF verificada y registra la auditoría. Todo o nada.
 */
export async function acceptInvitation(db: Database, input: { token: string; name: string; password: string }, ip: string): Promise<AcceptResult> {
  const invalid: AcceptResult = { ok: false, code: "invalid", message: "Esta invitación ya no es válida o expiró." };
  if (!(await allowAttempt(db, "token_use_ip", ip, { max: 30, windowSeconds: 15 * 60 }))) {
    return { ok: false, code: "throttled", message: "Hiciste muchos intentos. Esperá unos minutos y probá de nuevo." };
  }
  if (!isPlausibleToken(input.token)) return invalid;
  const invitation = await peekInvitation(db, input.token);
  if (!invitation) return invalid;

  const name = input.name.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 120);
  if (name.length < 2) return { ok: false, code: "invalid_name", message: "Escribí tu nombre." };
  const weak = validatePassword(input.password, invitation.email);
  if (weak) return { ok: false, code: "weak", message: weak };

  const passwordHash = await hashPassword(input.password);
  let res;
  try {
    res = await db.execute(sql`
    with inv as (
      update staff_invitations set accepted_at = now()
      where token_hash = ${hashToken(input.token)}::text and accepted_at is null and revoked_at is null and expires_at > now()
        and not exists (select 1 from users u where lower(u.email) = lower(staff_invitations.email))
      returning id, email, invited_by
    ),
    created as (
      insert into users (email, name, role, password_hash, email_verified_at, is_active)
      select inv.email, ${name}::text, 'STAFF', ${passwordHash}::text, now(), true from inv
      returning id, email
    ),
    aud as (
      insert into audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
      select created.id, 'staff_invitation_accepted', 'user', created.id::text,
             jsonb_build_object('actor', created.email, 'result', 'success', 'previousRole', null, 'newRole', 'STAFF', 'targetEmail', created.email, 'invitedBy', (select invited_by::text from inv))
      from created returning 1
    ),
    aud2 as (
      insert into audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
      select created.id, 'user_role_changed', 'user', created.id::text,
             jsonb_build_object('actor', created.email, 'result', 'success', 'previousRole', null, 'newRole', 'STAFF', 'via', 'invitation')
      from created returning 1
    )
    select id from created
  `);
  } catch {
    // Choque de correo único (alguien creó la cuenta justo ahora): la invitación NO se consumió.
    return invalid;
  }
  const row = res.rows[0] as { id?: string } | undefined;
  if (!row?.id) return invalid;
  return { ok: true, userId: row.id };
}
