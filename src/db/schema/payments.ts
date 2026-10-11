import { char, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { paymentStatusEnum } from "./enums";
import { orders } from "./orders";
import { money, primaryId, timestamps } from "./common";

/**
 * Pagos de un pedido. Es independiente del proveedor: `provider` es un texto
 * (p. ej. "manual" o el nombre del proveedor que se elija más adelante) y
 * `provider_reference` el id de la transacción en ese proveedor.
 *
 * NUNCA se guardan datos de tarjeta aquí (ni número, ni CVV). Eso lo maneja el
 * proveedor de pagos; nosotros solo guardamos referencias y estados.
 */
export const payments = pgTable(
  "payments",
  {
    id: primaryId(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    providerReference: text("provider_reference"),
    /** Intento de pago (1, 2…) dentro del pedido. Cada intento usa su PROPIO `orderNumber` ante el proveedor. */
    attempt: integer("attempt").notNull().default(1),
    /** `orderNumber` enviado al proveedor (único para siempre en el comercio: no se reutiliza entre intentos). */
    providerOrderNumber: text("provider_order_number"),
    /** HASH (sha256) del token de retorno: identifica el intento al volver del proveedor sin exponer el pedido. */
    returnTokenHash: text("return_token_hash"),
    /** Código y texto que el proveedor devolvió al VERIFICAR (consulta servidor a servidor), no los del navegador. */
    providerCode: text("provider_code"),
    providerMessage: text("provider_message"),
    /** Ambiente que el proveedor declaró en la verificación (p. ej. "Test"). */
    providerEnvironment: text("provider_environment"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    /** Cuándo se pidió la página de pago al proveedor (NULL = todavía no se pudo crear la sesión). */
    sessionRequestedAt: timestamp("session_requested_at", { withTimezone: true }),
    status: paymentStatusEnum("status").notNull().default("PENDING"),
    amount: money("amount").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("CRC"),
    /** Método usado (texto libre: tarjeta, transferencia, efectivo…). */
    method: text("method"),
    failureReason: text("failure_reason"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /** Datos NO sensibles devueltos por el proveedor (sin tarjetas ni secretos). */
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("payments_order_idx").on(t.orderId),
    uniqueIndex("payments_order_attempt_unique").on(t.orderId, t.attempt),
    uniqueIndex("payments_provider_order_number_unique").on(t.provider, t.providerOrderNumber).where(sql`${t.providerOrderNumber} IS NOT NULL`),
    uniqueIndex("payments_return_token_unique").on(t.returnTokenHash).where(sql`${t.returnTokenHash} IS NOT NULL`),
    // Evita registrar dos veces la misma transacción del mismo proveedor.
    uniqueIndex("payments_provider_reference_unique")
      .on(t.provider, t.providerReference)
      .where(sql`${t.providerReference} IS NOT NULL`),
  ],
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
