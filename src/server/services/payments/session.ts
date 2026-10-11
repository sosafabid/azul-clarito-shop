import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { orders, payments } from "@/db/schema";
import { routes } from "@/config/routes";
import { serverConfig } from "@/config/server";
import { toCurrency } from "@/domain/money";
import { buildProcessPaymentBody, crStateCode } from "@/domain/tilopay";
import { splitName } from "@/domain/checkout-form";
import { pgErrorCode } from "@/server/db-errors";
import { createPaymentSession, TilopayError } from "@/server/payments/tilopay/client";
import { readTilopayConfig } from "@/server/payments/tilopay/config";
import { recordPaymentEvent } from "./lifecycle";
import { verifyPayment, type VerifyResult } from "./verify";

/**
 * ABRIR LA PÁGINA DE PAGO (Hosted Payment Page) de un pedido pendiente.
 *
 * Una clienta NUNCA escribe datos de tarjeta aquí: se la redirige a Tilopay. El monto, la moneda y los datos del pedido salen de
 * lo que QUEDÓ GUARDADO en la base al crear el pedido (no de la petición actual).
 *
 * Reintentos (la API de Tilopay no es idempotente y un `orderNumber` no se puede reutilizar tras procesarse):
 *   - intento nuevo (nunca se pidió sesión)            → se pide directamente;
 *   - intento anterior con sesión pedida y pendiente   → PRIMERO se consulta su estado real: si ya se aprobó se confirma (y no
 *                                                         se cobra dos veces); si no, se anula ese intento y se abre uno nuevo
 *                                                         con otro `orderNumber` (`AC-…-2`, `-3`…);
 *   - intento rechazado                                → intento nuevo.
 */
export type SessionResult =
  | { kind: "redirect"; url: string; token: string; paymentId: string }
  | { kind: "paid"; orderId: string; verify: VerifyResult | null }
  | { kind: "unavailable" }
  | { kind: "not_payable" }
  | { kind: "failed"; reason: "provider" | "verification" | "busy"; token?: string };

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newReturnToken = () => randomBytes(24).toString("hex");
export const RETURN_TOKEN_PATTERN = /^[a-f0-9]{48}$/;

export async function openPaymentSession(db: Database, orderId: string, source: "checkout" | "return" | "admin" = "checkout"): Promise<SessionResult> {
  const state = readTilopayConfig();
  if (!state.ok) return { kind: "unavailable" };
  const { config } = state;

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { kind: "not_payable" };
  if (order.status === "PAID") return { kind: "paid", orderId, verify: null };
  if (order.status !== "PENDING") return { kind: "not_payable" };

  const attempts = await db.select().from(payments).where(eq(payments.orderId, orderId)).orderBy(desc(payments.attempt));
  const latest = attempts[0];
  let target = latest && latest.status === "PENDING" && !latest.sessionRequestedAt ? latest : null;
  let verify: VerifyResult | null = null;

  if (!target) {
    if (latest && latest.status === "PENDING") {
      // La sesión anterior ya se pidió: se consulta ANTES de abrir otra para no cobrar dos veces.
      verify = await verifyPayment(db, latest.id, source, { waitIfThrottled: true });
      if (!verify || verify.kind === "unavailable" || verify.kind === "review") return { kind: "failed", reason: "verification" };
      if (verify.kind === "paid") return { kind: "paid", orderId, verify };
    }
    // Intento nuevo (el anterior fue rechazado o no tiene transacción): UNA fila nueva y el anterior pendiente queda anulado.
    try {
      const created = await db.execute(sql`
        with nx as (select coalesce(max(attempt), 0) + 1 as n from payments where order_id = ${orderId}::uuid),
        sup as (
          update payments set status = 'CANCELLED', failure_reason = 'superseded', updated_at = now()
           where order_id = ${orderId}::uuid and status = 'PENDING' returning id
        ),
        ins as (
          insert into payments (order_id, provider, status, amount, currency, attempt, provider_order_number, method)
          select o.id, 'tilopay', 'PENDING', o.total, o.currency, nx.n, o.order_number || '-' || nx.n, 'card'
            from orders o, nx where o.id = ${orderId}::uuid and o.status = 'PENDING'
          returning id
        )
        select (select id from ins) as id
      `);
      const id = (created.rows[0] as { id?: string } | undefined)?.id;
      if (!id) return { kind: "not_payable" };
      const [fresh] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
      target = fresh ?? null;
    } catch (error) {
      if (pgErrorCode(error) === "23505") return { kind: "failed", reason: "busy" };
      throw error;
    }
  }
  if (!target || !target.providerOrderNumber) return { kind: "not_payable" };

  // Token de retorno NUEVO para este intento: viaja por Tilopay como `returnData` y vuelve intacto.
  const token = newReturnToken();
  await db.execute(sql`
    update payments set return_token_hash = ${hashToken(token)}::text, session_requested_at = now(), updated_at = now()
     where id = ${target.id}::uuid and status = 'PENDING'
  `);

  const address = order.shippingAddress;
  const { firstName, lastName } = splitName(order.customerName ?? "");
  const stateCode = crStateCode(address.stateProvince);
  if (!stateCode) {
    await recordPaymentEvent(db, { orderId, paymentId: target.id, source, type: "session_failed", detail: { kind: "invalid_state" } });
    return { kind: "failed", reason: "provider", token };
  }
  const body = buildProcessPaymentBody({
    key: config.key,
    redirectUrl: `${serverConfig.appBaseUrl}${routes.tilopayReturn}`,
    returnData: token,
    orderNumber: target.providerOrderNumber,
    amountMinor: order.total,
    currency: toCurrency(order.currency),
    customer: { firstName, lastName, email: order.email, phone: order.customerPhone ?? "" },
    address: { line1: address.line1, line2: address.line2 || address.district || address.city, city: address.city, stateCode, postalCode: address.postalCode ?? "", countryCode: address.countryCode },
  });

  try {
    const session = await createPaymentSession(config, body);
    await recordPaymentEvent(db, { orderId, paymentId: target.id, source, type: "session_created", detail: { attempt: target.attempt } });
    return { kind: "redirect", url: session.url, token, paymentId: target.id };
  } catch (error) {
    const kind = error instanceof TilopayError ? error.kind : "unknown";
    console.error(`[payments] No se pudo abrir la página de pago del pedido ${order.orderNumber} (${kind}).`);
    await recordPaymentEvent(db, { orderId, paymentId: target.id, source, type: "session_failed", detail: { kind, attempt: target.attempt } });
    return { kind: "failed", reason: "provider", token };
  }
}

/** Busca el intento por el token del retorno / enlace privado (se guarda solo su hash). */
export async function findPaymentByToken(db: Database, token: string): Promise<{ paymentId: string; orderId: string } | null> {
  if (!RETURN_TOKEN_PATTERN.test(token)) return null;
  const [row] = await db.select({ paymentId: payments.id, orderId: payments.orderId }).from(payments).where(eq(payments.returnTokenHash, hashToken(token))).limit(1);
  return row ?? null;
}
