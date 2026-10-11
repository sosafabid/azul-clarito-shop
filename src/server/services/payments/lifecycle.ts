import "server-only";
import { sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { pgErrorCode } from "@/server/db-errors";

/**
 * CAMBIOS DE ESTADO de pagos y pedidos. Cada función es UNA sentencia SQL atómica e IDEMPOTENTE:
 *  - solo se aplica si el estado de partida es el esperado (`where status = …`), así que repetirla (retorno del navegador
 *    dos veces, tarea de conciliación en paralelo, reintento) no hace nada la segunda vez;
 *  - mueve en el mismo instante el pedido, el pago, la reserva y el inventario: nunca queda a medias;
 *  - reserved → sold ocurre UNA sola vez (la reserva pasa de ACTIVE a COMMITTED y no vuelve a ACTIVE).
 * Nadie más escribe `orders.status = 'PAID'`: solo `confirmPayment`, y solo con un resultado VERIFICADO con el proveedor.
 */
export type PaymentSource = "return" | "reconcile" | "admin" | "expiry" | "checkout";

export type ConfirmResult =
  | { applied: true; orderChanged: boolean; paymentChanged: true }
  | { applied: false; reason: "already_applied" | "reference_conflict" };

export async function confirmPayment(
  db: Database,
  input: { paymentId: string; providerReference: string | null; code: string; message: string; environment: string; source: PaymentSource },
): Promise<ConfirmResult> {
  const detail = JSON.stringify({ code: input.code, environment: input.environment, providerReference: input.providerReference });
  try {
    const result = await db.execute(sql`
      with p as (
        update payments
           set status = 'PAID', provider_reference = ${input.providerReference}::text, paid_at = now(), verified_at = now(),
               last_checked_at = now(), provider_code = ${input.code}::text, provider_message = ${input.message}::text,
               provider_environment = ${input.environment}::text, failure_reason = null, updated_at = now()
         where id = ${input.paymentId}::uuid and status <> 'PAID'
        returning id, order_id
      ),
      o as (
        update orders
           set status = 'PAID', paid_at = now(), updated_at = now()
          from p
         where orders.id = p.order_id and orders.status = 'PENDING'
        returning orders.id, orders.cart_id
      ),
      late as (
        update orders
           set payment_review_reason = case when orders.status = 'PAID' then 'Se aprobó un segundo pago para un pedido que ya estaba pagado (posible cobro doble): revisar en Tilopay y reembolsar.'
                                            else 'Se aprobó un pago cuando el pedido ya estaba en estado ' || orders.status || ' (cancelado o vencido): revisar en Tilopay y reembolsar o reactivar.' end,
               updated_at = now()
          from p
         where orders.id = p.order_id and orders.status <> 'PENDING'
        returning orders.id
      ),
      rv as (
        update inventory_reservations r
           set status = 'COMMITTED', resolved_at = now()
          from o
         where r.order_id = o.id and r.status = 'ACTIVE'
        returning r.inventory_id, r.quantity
      ),
      inv as (
        update inventory i
           set reserved_stock = i.reserved_stock - rv.quantity, sold_stock = i.sold_stock + rv.quantity, updated_at = now()
          from rv
         where i.id = rv.inventory_id
        returning i.id
      ),
      cl as (
        delete from cart_items ci
         using o, order_items oi
         where o.cart_id is not null and ci.cart_id = o.cart_id and oi.order_id = o.id
           and ci.product_id = oi.product_id and ci.variant_id is not distinct from oi.variant_id
        returning ci.id
      ),
      ev as (
        insert into payment_events (order_id, payment_id, source, type, detail)
        select p.order_id, p.id, ${input.source}::text,
               case when exists (select 1 from o) then 'payment_confirmed' else 'payment_confirmed_needs_review' end,
               ${detail}::jsonb
          from p
        returning id
      )
      select (select count(*) from p)::int as payment_changed, (select count(*) from o)::int as order_changed
    `);
    const row = result.rows[0] as { payment_changed?: number; order_changed?: number } | undefined;
    if (!row || Number(row.payment_changed) === 0) return { applied: false, reason: "already_applied" };
    return { applied: true, paymentChanged: true, orderChanged: Number(row.order_changed) > 0 };
  } catch (error) {
    if (pgErrorCode(error) === "23505") return { applied: false, reason: "reference_conflict" };
    throw error;
  }
}

/** El proveedor RECHAZÓ el intento (verificado). El pedido sigue pendiente con su reserva: la clienta puede reintentar. */
export async function rejectPayment(
  db: Database,
  input: { paymentId: string; providerReference: string | null; code: string; message: string; environment: string; source: PaymentSource },
): Promise<boolean> {
  const detail = JSON.stringify({ code: input.code, environment: input.environment });
  const result = await db.execute(sql`
    with p as (
      update payments
         set status = 'FAILED', provider_reference = ${input.providerReference}::text, verified_at = now(), last_checked_at = now(),
             provider_code = ${input.code}::text, provider_message = ${input.message}::text, provider_environment = ${input.environment}::text,
             failure_reason = 'rejected', updated_at = now()
       where id = ${input.paymentId}::uuid and status = 'PENDING'
      returning id, order_id
    ),
    ev as (
      insert into payment_events (order_id, payment_id, source, type, detail)
      select p.order_id, p.id, ${input.source}::text, 'payment_rejected', ${detail}::jsonb from p returning id
    )
    select count(*)::int as changed from p
  `).catch((error: unknown) => {
    // Dos intentos distintos no pueden compartir la misma referencia del proveedor: se deja constancia sin cambiar el pago.
    if (pgErrorCode(error) === "23505") return { rows: [{ changed: 0 }] };
    throw error;
  });
  return Number((result.rows[0] as { changed?: number } | undefined)?.changed) > 0;
}

/**
 * Cancela un pedido PENDIENTE y libera su stock reservado (cancelación de la clienta, del equipo o vencimiento).
 * Un pedido ya pagado, o ya cancelado, no se toca (devuelve `false`).
 */
export async function cancelPendingOrder(
  db: Database,
  input: { orderId: string; reason: "customer_cancelled" | "expired" | "admin_cancelled" | "verification_unavailable"; source: PaymentSource; actor?: string },
): Promise<boolean> {
  const detail = JSON.stringify({ reason: input.reason, actor: input.actor ?? null });
  const result = await db.execute(sql`
    with o as (
      update orders
         set status = 'CANCELLED', cancelled_at = now(), updated_at = now()
       where id = ${input.orderId}::uuid and status = 'PENDING'
      returning id
    ),
    p as (
      update payments
         set status = 'CANCELLED', failure_reason = coalesce(failure_reason, ${input.reason}::text), updated_at = now()
        from o
       where payments.order_id = o.id and payments.status = 'PENDING'
      returning payments.id
    ),
    rv as (
      update inventory_reservations r
         set status = 'RELEASED', resolved_at = now()
        from o
       where r.order_id = o.id and r.status = 'ACTIVE'
      returning r.inventory_id, r.quantity
    ),
    inv as (
      update inventory i
         set available_stock = i.available_stock + rv.quantity, reserved_stock = i.reserved_stock - rv.quantity, updated_at = now()
        from rv
       where i.id = rv.inventory_id
      returning i.id
    ),
    ev as (
      insert into payment_events (order_id, source, type, detail)
      select o.id, ${input.source}::text, 'order_cancelled', ${detail}::jsonb from o returning id
    )
    select count(*)::int as cancelled from o
  `);
  return Number((result.rows[0] as { cancelled?: number } | undefined)?.cancelled) > 0;
}

/** Marca un pedido para revisión humana (monto/moneda/ambiente que no coinciden, verificación imposible…). */
export async function flagForReview(db: Database, orderId: string, reason: string): Promise<void> {
  await db.execute(sql`
    update orders set payment_review_reason = coalesce(payment_review_reason, ${reason}::text), updated_at = now()
     where id = ${orderId}::uuid
  `);
}

export async function recordPaymentEvent(
  db: Database,
  input: { orderId: string; paymentId: string | null; source: PaymentSource; type: string; detail?: Record<string, unknown> },
): Promise<void> {
  await db.execute(sql`
    insert into payment_events (order_id, payment_id, source, type, detail)
    values (${input.orderId}::uuid, ${input.paymentId}::uuid, ${input.source}::text, ${input.type}::text, ${input.detail ? JSON.stringify(input.detail) : null}::jsonb)
  `);
}

/**
 * Cierra una alerta de revisión de pago (cobro tardío, posible cobro doble, referencia repetida…). Quien la cierra DEBE dejar una nota
 * (qué se hizo: reembolso en el portal, entrega manual, etc.); queda en el registro de eventos con la persona y la fecha.
 * No cambia el estado del pedido ni del pago: solo documenta la resolución.
 */
export async function resolvePaymentReview(db: Database, input: { orderId: string; note: string; actor: string }): Promise<boolean> {
  const detail = JSON.stringify({ note: input.note, actor: input.actor });
  const result = await db.execute(sql`
    with o as (
      update orders set payment_review_reason = null, updated_at = now()
       where id = ${input.orderId}::uuid and payment_review_reason is not null
      returning id
    ), ev as (
      insert into payment_events (order_id, payment_id, source, type, detail)
      select o.id, null, 'admin', 'review_resolved', ${detail}::jsonb from o
      returning id
    )
    select (select count(*) from o)::int as n
  `);
  return Number((result.rows[0] as { n?: number } | undefined)?.n ?? 0) > 0;
}
