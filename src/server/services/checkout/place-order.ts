import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Database } from "@/db/client";
import { inventory, orders, productVariants } from "@/db/schema";
import { toCurrency, type CurrencyCode } from "@/domain/money";
import { STORE_COUNTRY } from "@/domain/shipping";
import type { CheckoutFormInput } from "@/domain/checkout-form";
import { readTilopayConfig } from "@/server/payments/tilopay/config";
import { findCartId } from "@/server/services/cart/cart";
import type { CartOwner } from "@/server/services/cart/types";
import { createPendingOrder, type OrderLineInput } from "@/server/services/orders/create";
import { settleExpiredOrders } from "@/server/services/payments/reconcile";
import { calculateCheckoutTotals } from "./totals";

/**
 * COLOCAR EL PEDIDO: de un carrito + los datos de la clienta a un pedido PENDIENTE con el stock reservado.
 *
 * Recibe SOLO quién es la dueña del carrito y lo que la clienta escribió (nombre, correo, teléfono, dirección). Nunca un precio,
 * impuesto, costo de envío ni total: todo se recalcula aquí con `calculateCheckoutTotals` (precios, tasa y tarifas vigentes en la
 * base de datos). Si no hay una tarifa de envío para la dirección, NO se cobra: se bloquea y se explica.
 */
export type PlaceOrderFailure =
  | "payments_unavailable"
  | "empty_or_blocked"
  | "shipping_not_configured"
  | "currency_not_supported"
  | "pending_exists"
  | "insufficient_stock"
  | "changed"
  | "error";

export type PlaceOrderResult =
  | { ok: true; orderId: string; orderNumber: string; paymentId: string }
  | { ok: false; code: PlaceOrderFailure; message: string };

const FAILURES: Record<PlaceOrderFailure, string> = {
  payments_unavailable: "El pago en línea no está disponible por el momento. Escribinos y te ayudamos a completar tu compra.",
  empty_or_blocked: "Tenés que revisar tu carrito antes de continuar.",
  shipping_not_configured: "Todavía no tenemos configurado el envío para ese destino, así que no podemos cobrarte. Escribinos y lo resolvemos.",
  currency_not_supported: "Esta moneda todavía no está habilitada para pagar en línea.",
  pending_exists: "Ya tenés un pedido pendiente de pago. Podés continuar con él o cancelarlo para empezar de nuevo.",
  insufficient_stock: "Alguien más se llevó una de las unidades mientras comprabas. Revisá tu carrito.",
  changed: "Algo cambió en los productos o precios mientras comprabas. Revisá tu carrito y volvé a intentar.",
  error: "No pudimos crear tu pedido. Intentá de nuevo en unos minutos.",
};

export async function placeOrder(
  db: Database,
  input: { owner: CartOwner; userId: string | null; form: CheckoutFormInput },
): Promise<PlaceOrderResult> {
  const fail = (code: PlaceOrderFailure, message?: string): PlaceOrderResult => ({ ok: false, code, message: message ?? FAILURES[code] });
  const state = readTilopayConfig();
  if (!state.ok) return fail("payments_unavailable");

  const { form } = input;
  const { totals, cart } = await calculateCheckoutTotals(db, {
    owner: input.owner,
    destination: { country: STORE_COUNTRY, province: form.province, city: form.city, postalCode: form.postalCode },
    shippingMethodId: null,
  });
  if (totals.blockers.length > 0) return fail("empty_or_blocked", totals.blockers.map((b) => b.message).join(" "));
  // Pedido solo digital: no hay envío que configurar. Si hay algo físico, tiene que haber tarifa para el destino.
  if (totals.shipping.required && totals.shipping.state !== "selected") return fail("shipping_not_configured");
  if (!totals.canProceed || !totals.snapshot) return fail("empty_or_blocked");
  const currency: CurrencyCode = toCurrency(totals.currency);
  if (!state.config.currencies.includes(currency)) return fail("currency_not_supported");

  const cartId = await findCartId(db, input.owner);
  if (!cartId) return fail("empty_or_blocked");
  if (await getPendingOrderForCart(db, input.owner)) return fail("pending_exists");

  // Fila de inventario de cada línea FÍSICA (producto simple = variante nula; con variantes = una fila por variante).
  // Las líneas digitales no tienen inventario: no se reservan ni se descuentan.
  const productIds = [...new Set(cart.lines.filter((line) => line.fulfillment === "PHYSICAL").map((line) => line.productId))];
  const inventoryRows = productIds.length > 0 ? await db.select({ id: inventory.id, productId: inventory.productId, variantId: inventory.variantId }).from(inventory).where(inArray(inventory.productId, productIds)) : [];
  const variantIds = cart.lines.map((l) => l.variantId).filter((v): v is string => v !== null);
  const optionRows = variantIds.length > 0 ? await db.select({ id: productVariants.id, options: productVariants.options }).from(productVariants).where(inArray(productVariants.id, variantIds)) : [];
  const optionsOf = new Map(optionRows.map((row) => [row.id, row.options as Record<string, string> | null]));

  const lines: OrderLineInput[] = [];
  for (const line of cart.lines) {
    const digital = line.fulfillment === "DIGITAL";
    const row = digital ? null : inventoryRows.find((r) => r.productId === line.productId && r.variantId === line.variantId);
    if (!digital && !row) return fail("empty_or_blocked");
    lines.push({
      inventoryId: row?.id ?? null,
      fulfillment: line.fulfillment,
      productId: line.productId,
      variantId: line.variantId,
      name: line.variantLabel ? `${line.name} (${line.variantLabel})` : line.name,
      sku: line.sku,
      imageUrl: line.imageUrl,
      variantOptions: line.variantId ? (optionsOf.get(line.variantId) ?? null) : null,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
    });
  }

  const draft: Parameters<typeof createPendingOrder>[1] = {
    userId: input.userId,
    cartId,
    customer: { name: form.name, email: form.email, phone: form.phone },
    address: {
      recipientName: form.name,
      phone: form.phone,
      countryCode: STORE_COUNTRY,
      stateProvince: form.province,
      city: form.city,
      district: form.district,
      postalCode: form.postalCode,
      line1: form.line1,
      line2: form.line2 || null,
      deliveryNotes: null,
    },
    notes: form.notes || null,
    snapshot: totals.snapshot,
    requiresShipping: totals.shipping.required,
    currency,
    lines,
  };
  let created = await createPendingOrder(db, draft);
  if (!created.ok && created.code === "insufficient_stock") {
    // Quizá las unidades las retiene una reserva VENCIDA de otra clienta: se resuelve ahora (verificando su pago) y se reintenta UNA vez.
    const swept = await settleExpiredOrders(db, { limit: 10, source: "expiry" });
    if (swept.cancelled > 0) created = await createPendingOrder(db, draft);
  }
  if (!created.ok) return fail(created.code);
  return { ok: true, orderId: created.orderId, orderNumber: created.orderNumber, paymentId: created.paymentId };
}

export type PendingOrderSummary = { id: string; orderNumber: string; total: number; currency: CurrencyCode };

/** El pedido pendiente de pago de este carrito (si lo hay): sirve para retomarlo en vez de crear uno duplicado. */
export async function getPendingOrderForCart(db: Database, owner: CartOwner): Promise<PendingOrderSummary | null> {
  const cartId = await findCartId(db, owner);
  if (!cartId) return null;
  const [row] = await db
    .select({ id: orders.id, orderNumber: orders.orderNumber, total: orders.total, currency: orders.currency })
    .from(orders)
    .where(and(eq(orders.cartId, cartId), eq(orders.status, "PENDING")))
    .orderBy(desc(orders.placedAt))
    .limit(1);
  return row ? { id: row.id, orderNumber: row.orderNumber, total: row.total, currency: toCurrency(row.currency) } : null;
}
