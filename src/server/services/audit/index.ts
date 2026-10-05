import "server-only";
import type { Database } from "@/db/client";
import { auditLogs, type NewAuditLog } from "@/db/schema";
import { isUuid } from "@/domain/ids";
import type { AuthSession } from "@/server/auth/session";

export type AuditActor = {
  /** Id real del usuario en `users`, o `null` (p. ej. la sesión falsa de desarrollo). */
  actorUserId: string | null;
  /** Texto legible que también se guarda en `metadata.actor`. */
  label: string;
};

/**
 * `audit_logs.actor_user_id` es una llave foránea a `users`. Con autenticación
 * real siempre hay un usuario; el correo también se guarda en `metadata.actor`
 * para que el registro siga siendo legible aunque la cuenta se elimine.
 */
export function resolveAuditActor(session: Pick<AuthSession, "userId" | "email">): AuditActor {
  return {
    actorUserId: isUuid(session.userId) ? session.userId : null,
    label: session.email,
  };
}

export type AuditEntry = {
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
};

export function toAuditRow(actor: AuditActor, entry: AuditEntry): NewAuditLog {
  return {
    actorUserId: actor.actorUserId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    // No guardar secretos ni datos de pago aquí.
    metadata: { ...entry.metadata, actor: actor.label },
  };
}

/**
 * Devuelve la sentencia de inserción SIN ejecutarla, para incluirla en un
 * `db.batch([...])` junto con el cambio que se audita (todo o nada).
 */
export function auditInsert(db: Database, actor: AuditActor, entries: readonly AuditEntry[]) {
  return db.insert(auditLogs).values(entries.map((entry) => toAuditRow(actor, entry)));
}
