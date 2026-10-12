import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Database } from "@/db/client";
import { orderItems, orderNotifications, orders, paymentEvents, payments } from "@/db/schema";
import { digitalItemsForPage, isOrderPaid } from "@/server/services/digital/delivery";
import { findPaymentByToken } from "@/server/services/payments/session";

/**
 * Datos de la página de resultado, por token privado. Devuelve SOLO lo que la clienta ve (nunca costos, referencias del
 * proveedor ni datos de tarjeta). La vista (`view`) sale del estado guardado, que solo cambia con la verificación a Tilopay.
 */
export type CheckoutResultView = "paid" | "verifying" | "failed" | "cancelled";

export type CheckoutResult = {
  orderNumber: string;
  email: string;
  currency: string;
  subtotal: number;
  taxTotal: number;
  shippingTotal: number;
  total: number;
  destination: string;
  items: { name: string; quantity: number; lineTotal: number }[];
  view: CheckoutResultView;
  /** La página de pago nunca llegó a abrirse (error al crearla). */
  sessionProblem: boolean;
  /** Pedido cancelado pero con un cobro aprobado por Tilopay: el equipo lo está resolviendo. */
  chargedWhileCancelled: boolean;
  /** false = pedido solo digital: no hay envío ni dirección de entrega. */
  requiresShipping: boolean;
  /** Libros digitales descargables. SOLO con el pago verificado (estado del pedido + pago aprobado en la base); si no, vacío. */
  downloads: { orderItemId: string; name: string; available: boolean }[];
  /** El correo con los enlaces ya se envió (el servicio de correo puede no estar configurado). */
  downloadsEmailed: boolean;
};

export async function loadCheckoutResult(db: Database, token: string): Promise<CheckoutResult | null> {
  const found = await findPaymentByToken(db, token);
  if (!found) return null;
  const [order] = await db.select().from(orders).where(eq(orders.id, found.orderId)).limit(1);
  if (!order) return null;
  const items = await db.select({ name: orderItems.nameSnapshot, quantity: orderItems.quantity, lineTotal: orderItems.lineTotal }).from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(asc(orderItems.createdAt));
  const [latest] = await db.select().from(payments).where(eq(payments.orderId, order.id)).orderBy(desc(payments.attempt)).limit(1);

  const [lastSession] = latest
    ? await db.select({ type: paymentEvents.type }).from(paymentEvents).where(and(eq(paymentEvents.paymentId, latest.id), inArray(paymentEvents.type, ["session_created", "session_failed"]))).orderBy(desc(paymentEvents.createdAt)).limit(1)
    : [];
  const paid = order.status !== "PENDING" && order.status !== "CANCELLED" && order.status !== "REFUNDED";
  const view: CheckoutResultView = paid ? "paid" : order.status === "CANCELLED" || order.status === "REFUNDED" ? "cancelled" : latest?.status === "FAILED" ? "failed" : "verifying";
  const address = order.shippingAddress;
  // Los botones de descarga dependen del pago VERIFICADO en la base, no de la URL ni de haber vuelto a esta página.
  const downloads = view === "paid" && (await isOrderPaid(db, order.id)) ? await digitalItemsForPage(db, order.id) : [];
  const [mailed] = downloads.length > 0 ? await db.select({ status: orderNotifications.status }).from(orderNotifications).where(and(eq(orderNotifications.orderId, order.id), eq(orderNotifications.event, "digital_delivery"))).limit(1) : [];
  return {
    requiresShipping: order.requiresShipping,
    downloads,
    downloadsEmailed: mailed?.status === "SENT",
    orderNumber: order.orderNumber,
    email: order.email,
    currency: order.currency,
    subtotal: order.subtotal,
    taxTotal: order.taxTotal,
    shippingTotal: order.shippingTotal,
    total: order.total,
    destination: [address.district, address.city, address.stateProvince].filter(Boolean).join(", "),
    items,
    view,
    chargedWhileCancelled: view === "cancelled" && order.paymentReviewReason !== null,
    sessionProblem: latest?.status === "PENDING" && lastSession?.type === "session_failed",
  };
}
