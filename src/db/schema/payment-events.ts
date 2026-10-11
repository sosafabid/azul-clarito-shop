import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { orders } from "./orders";
import { payments } from "./payments";
import { primaryId } from "./common";

/**
 * BITÁCORA de pagos para conciliación y auditoría (solo se AGREGA, nunca se edita ni se borra).
 * Cada intento de verificar o cambiar un pago deja una fila: de dónde vino (`source`), qué se concluyó y por qué.
 * NUNCA guarda datos de tarjeta, tokens, claves ni el cuerpo completo de las respuestas: solo campos NO sensibles.
 */
export const paymentEvents = pgTable(
  "payment_events",
  {
    id: primaryId(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "restrict" }),
    /** return = volvió el navegador · reconcile = tarea de recuperación · admin = revisión manual · checkout = creación. */
    source: text("source", { enum: ["checkout", "return", "reconcile", "admin", "expiry"] }).notNull(),
    /** Qué pasó: session_created, session_failed, verified_approved, verified_rejected, not_found, mismatch, applied, duplicate, expired, cancelled, error… */
    type: text("type").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payment_events_order_idx").on(t.orderId, t.createdAt), index("payment_events_payment_idx").on(t.paymentId)],
);
export type PaymentEvent = typeof paymentEvents.$inferSelect;

/**
 * Correos transaccionales de un pedido: UNA fila por (pedido, evento). Reclamar la fila antes de enviar es lo que
 * impide los duplicados cuando un evento llega dos veces; si el envío falla queda FAILED y se reintenta después.
 */
export const orderNotifications = pgTable(
  "order_notifications",
  {
    id: primaryId(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    event: text("event").notNull(),
    status: text("status", { enum: ["PENDING", "SENT", "FAILED"] }).notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(1),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("order_notifications_order_event_unique").on(t.orderId, t.event)],
);
