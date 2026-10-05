import { char, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
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
    // Evita registrar dos veces la misma transacción del mismo proveedor.
    uniqueIndex("payments_provider_reference_unique")
      .on(t.provider, t.providerReference)
      .where(sql`${t.providerReference} IS NOT NULL`),
  ],
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
