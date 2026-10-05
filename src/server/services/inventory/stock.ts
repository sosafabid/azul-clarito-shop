import "server-only";
import { sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { toAuditRow, type AuditActor, type AuditEntry } from "@/server/services/audit";

/**
 * Cambia el stock DISPONIBLE de una fila de inventario con UNA sola sentencia:
 * solo se aplica si el stock sigue valiendo lo que la persona vio al abrir el
 * formulario (`expected`), y en ese mismo instante se escribe el registro de
 * auditoría. Si otra operación lo cambió mientras tanto (p. ej. una reserva),
 * no se modifica nada y devuelve `false`.
 *
 * (El driver HTTP de Neon no permite transacciones interactivas; por eso es
 * una sola sentencia con CTE.)
 */
export async function adjustAvailableStock(
  db: Database,
  input: { inventoryId: string; expected: number; next: number; actor: AuditActor; audit: AuditEntry },
): Promise<boolean> {
  const row = toAuditRow(input.actor, input.audit);
  const result = await db.execute(sql`
    with upd as (
      update inventory
         set available_stock = ${input.next}, updated_at = now()
       where id = ${input.inventoryId} and available_stock = ${input.expected}
      returning id
    )
    insert into audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    select ${row.actorUserId ?? null}::uuid, ${row.action}::text, ${row.entityType}::text,
           ${row.entityId ?? null}::text, ${JSON.stringify(row.metadata)}::jsonb
      from upd
    returning id
  `);
  return result.rows.length > 0;
}
