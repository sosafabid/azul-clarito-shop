import "server-only";
import { and, count, desc, eq, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import type { Database } from "@/db/client";
import { auditLogs, users } from "@/db/schema";
import type { UserRole } from "@/domain/roles";
import {
  USERS_PAGE_SIZE,
  escapeLike,
  evaluateRoleChange,
  evaluateStaffAccessChange,
  type Actor,
  type Denial,
  type UserRoleFilter,
  type UserStatusFilter,
  type UserVerifiedFilter,
  USER_AUDIT_ACTIONS,
} from "@/domain/user-admin";
import { auditInsert, type AuditActor } from "@/server/services/audit";

/**
 * USUARIOS Y ROLES (solo SUPER_ADMIN; el llamador ya validó el permiso en el servidor).
 *
 * - Las lecturas eligen columnas EXPLÍCITAS: jamás hash, intentos, tokens ni secretos.
 * - Cada cambio es UNA sentencia SQL con las condiciones dentro (no se confía en lo leído antes),
 *   y se audita en la misma sentencia. Además un trigger en la base protege a la última SUPER_ADMIN.
 * - Un intento rechazado también queda en la bitácora con `result: "denied"`.
 */
export type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  isActive: boolean;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
};

const columns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  isActive: users.isActive,
  emailVerifiedAt: users.emailVerifiedAt,
  createdAt: users.createdAt,
  lastLoginAt: users.lastLoginAt,
};

export type UserListQuery = { search: string; role: UserRoleFilter; status: UserStatusFilter; verified: UserVerifiedFilter; page: number };

function filters(q: UserListQuery): SQL | undefined {
  const conds: SQL[] = [];
  if (q.search) {
    const like = `%${escapeLike(q.search)}%`;
    conds.push(or(ilike(users.email, like), ilike(users.name, like))!);
  }
  if (q.role !== "todos") conds.push(eq(users.role, q.role));
  if (q.status === "activo") conds.push(eq(users.isActive, true));
  if (q.status === "suspendido") conds.push(eq(users.isActive, false));
  if (q.verified === "verificado") conds.push(isNotNull(users.emailVerifiedAt));
  if (q.verified === "no-verificado") conds.push(isNull(users.emailVerifiedAt));
  return conds.length ? and(...conds) : undefined;
}

export async function listUsers(db: Database, q: UserListQuery): Promise<{ rows: UserRow[]; total: number; pages: number }> {
  const where = filters(q);
  const [[totals], rows] = await Promise.all([
    db.select({ n: count() }).from(users).where(where),
    db
      .select(columns)
      .from(users)
      .where(where)
      .orderBy(sql`case ${users.role} when 'SUPER_ADMIN' then 0 when 'STAFF' then 1 else 2 end`, desc(users.createdAt))
      .limit(USERS_PAGE_SIZE)
      .offset((q.page - 1) * USERS_PAGE_SIZE),
  ]);
  const total = totals?.n ?? 0;
  return { rows, total, pages: Math.max(1, Math.ceil(total / USERS_PAGE_SIZE)) };
}

export async function getUser(db: Database, id: string): Promise<UserRow | null> {
  const [row] = await db.select(columns).from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

export async function countActiveSuperAdmins(db: Database): Promise<number> {
  const [row] = await db.select({ n: count() }).from(users).where(and(eq(users.role, "SUPER_ADMIN"), eq(users.isActive, true)));
  return row?.n ?? 0;
}

export type HistoryEntry = {
  id: string;
  action: string;
  createdAt: Date;
  actor: string | null;
  previousRole: string | null;
  newRole: string | null;
  result: string | null;
};

/** Historial de la cuenta: cambios de rol y accesos (solo campos seguros de `metadata`). */
export async function getUserHistory(db: Database, userId: string, limit = 50): Promise<HistoryEntry[]> {
  const rows = await db
    .select({ id: auditLogs.id, action: auditLogs.action, createdAt: auditLogs.createdAt, metadata: auditLogs.metadata })
    .from(auditLogs)
    .where(and(eq(auditLogs.entityType, "user"), eq(auditLogs.entityId, userId), inArray(auditLogs.action, [...USER_AUDIT_ACTIONS])))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
  const s = (v: unknown) => (typeof v === "string" ? v : null);
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    createdAt: r.createdAt,
    actor: s(r.metadata?.actor),
    previousRole: s(r.metadata?.previousRole),
    newRole: s(r.metadata?.newRole),
    result: s(r.metadata?.result),
  }));
}

export type ChangeResult = { ok: true } | { ok: false; code: Denial | "not_found" | "conflict"; message: string };

async function auditDenied(db: Database, actor: AuditActor, action: string, target: { id: string; role: UserRole } | null, targetId: string, newRole: string | null, reason: string) {
  await auditInsert(db, actor, [
    {
      action,
      entityType: "user",
      entityId: targetId,
      metadata: { result: "denied", reason, previousRole: target?.role ?? null, newRole },
    },
  ]);
}

const CONFLICT: ChangeResult = { ok: false, code: "conflict", message: "La cuenta cambió mientras tanto o la operación no es válida. Recargá e intentá de nuevo." };

/** Asigna STAFF o devuelve a CUSTOMER. `actor` viene SIEMPRE de la sesión, nunca del navegador. */
export async function changeUserRole(db: Database, actor: Actor, auditActor: AuditActor, targetId: string, newRole: string): Promise<ChangeResult> {
  const target = await getUser(db, targetId);
  if (!target) return { ok: false, code: "not_found", message: "No encontramos esa cuenta." };
  const decision = evaluateRoleChange(actor, target, newRole);
  if (!decision.ok) {
    await auditDenied(db, auditActor, "user_role_changed", target, targetId, newRole, decision.code);
    return decision;
  }
  const removal = target.role === "STAFF" && newRole === "CUSTOMER";
  const actorLabel = auditActor.label;
  try {
    const res = await db.execute(sql`
      with prev as (select id, role from users where id = ${targetId}::uuid),
      upd as (
        update users set role = ${newRole}, updated_at = now()
        where id = ${targetId}::uuid and role in ('STAFF','CUSTOMER') and role <> ${newRole}
          and exists (select 1 from users a where a.id = ${actor.id}::uuid and a.role = 'SUPER_ADMIN' and a.is_active)
        returning id
      ),
      aud as (
        insert into audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
        select ${actor.id}::uuid, 'user_role_changed', 'user', upd.id::text,
               jsonb_build_object('actor', ${actorLabel}::text, 'result', 'success', 'previousRole', prev.role, 'newRole', ${newRole}::text, 'targetEmail', ${target.email}::text)
        from upd join prev on prev.id = upd.id returning 1
      ),
      aud2 as (
        insert into audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
        select ${actor.id}::uuid, 'user_administrative_access_removed', 'user', upd.id::text,
               jsonb_build_object('actor', ${actorLabel}::text, 'result', 'success', 'previousRole', prev.role, 'newRole', ${newRole}::text, 'targetEmail', ${target.email}::text)
        from upd join prev on prev.id = upd.id where ${removal} returning 1
      ),
      gone as (delete from sessions where user_id = ${targetId}::uuid and ${removal} and exists (select 1 from upd) returning 1)
      select (select count(*) from upd)::int as changed
    `);
    const changed = Number((res.rows[0] as { changed?: number } | undefined)?.changed ?? 0);
    if (changed !== 1) {
      await auditDenied(db, auditActor, "user_role_changed", target, targetId, newRole, "conflict");
      return CONFLICT;
    }
    return { ok: true };
  } catch {
    return CONFLICT;
  }
}

/** Suspende o reactiva el acceso de una persona STAFF. Al suspender se cierran sus sesiones. */
export async function setStaffAccess(db: Database, actor: Actor, auditActor: AuditActor, targetId: string, suspend: boolean): Promise<ChangeResult> {
  const target = await getUser(db, targetId);
  if (!target) return { ok: false, code: "not_found", message: "No encontramos esa cuenta." };
  const action = suspend ? "staff_access_suspended" : "staff_access_reactivated";
  const decision = evaluateStaffAccessChange(actor, target, suspend);
  if (!decision.ok) {
    await auditDenied(db, auditActor, action, target, targetId, target.role, decision.code);
    return decision;
  }
  const actorLabel = auditActor.label;
  try {
    const res = await db.execute(sql`
      with upd as (
        update users set is_active = ${!suspend}, updated_at = now()
        where id = ${targetId}::uuid and role = 'STAFF' and is_active = ${suspend}
          and exists (select 1 from users a where a.id = ${actor.id}::uuid and a.role = 'SUPER_ADMIN' and a.is_active)
        returning id
      ),
      aud as (
        insert into audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
        select ${actor.id}::uuid, ${action}::text, 'user', upd.id::text,
               jsonb_build_object('actor', ${actorLabel}::text, 'result', 'success', 'previousRole', 'STAFF', 'newRole', 'STAFF', 'targetEmail', ${target.email}::text)
        from upd returning 1
      ),
      gone as (delete from sessions where user_id = ${targetId}::uuid and ${suspend} and exists (select 1 from upd) returning 1)
      select (select count(*) from upd)::int as changed
    `);
    const changed = Number((res.rows[0] as { changed?: number } | undefined)?.changed ?? 0);
    if (changed !== 1) {
      await auditDenied(db, auditActor, action, target, targetId, target.role, "conflict");
      return CONFLICT;
    }
    return { ok: true };
  } catch {
    return CONFLICT;
  }
}
