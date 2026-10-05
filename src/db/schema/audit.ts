import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
import { primaryId } from "./common";

/**
 * Bitácora de acciones administrativas ("quién cambió qué y cuándo").
 * Solo se inserta; no se edita ni se borra desde la aplicación.
 *
 * No guardar secretos ni datos de pago dentro de `metadata`.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: primaryId(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    /** p. ej. "product.update", "order.status_changed". */
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_actor_idx").on(t.actorUserId),
    index("audit_logs_created_at_idx").on(t.createdAt),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
