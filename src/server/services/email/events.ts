import type { CurrencyCode } from "@/domain/money";

/** Datos mínimos que necesita cualquier email de un pedido. */
export type OrderEmailData = {
  orderNumber: string;
  customerName?: string | null;
  total: number;
  currency: CurrencyCode;
};

/** Resumen completo del pedido (copias históricas guardadas al comprar) para los correos de compra. */
export type OrderSummaryEmailData = OrderEmailData & {
  items: { name: string; quantity: number; lineTotal: number }[];
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  taxIncluded: boolean;
  /** "Escazú, San José" — sin la dirección exacta. */
  destination: string;
  /** Enlace privado para ver el estado del pedido o reintentar el pago (lleva un token: no se registra en logs). */
  statusUrl?: string | null;
};

/**
 * Eventos de email de la tienda y los datos que necesita cada uno.
 * Agregar un evento = agregar una entrada aquí (TypeScript obliga a
 * proveer sus datos al enviarlo).
 */
export type EmailEventMap = {
  order_received: OrderSummaryEmailData;
  payment_confirmed: OrderSummaryEmailData;
  /** El pago NO se aprobó (rechazado o vencido). No afirma ningún cobro. */
  payment_failed: OrderSummaryEmailData;
  order_preparing: OrderEmailData;
  order_shipped: OrderEmailData & {
    carrier: string;
    trackingNumber: string;
    trackingUrl?: string | null;
  };
  order_delivered: OrderEmailData;
  order_cancelled: OrderSummaryEmailData;
  refund_issued: OrderEmailData & { refundAmount: number };
  /** Venta CONFIRMADA (pago verificado con el proveedor). `adminUrl` lleva al pedido en el panel. */
  admin_new_order: OrderSummaryEmailData & { customerEmail: string; adminUrl: string; transactionId: string | null; needsReview: boolean };
  /** Aviso INTERNO: Tilopay aprobó un cobro para un pedido que ya no estaba pendiente. Requiere acción humana. */
  admin_payment_review: OrderSummaryEmailData & { customerEmail: string; adminUrl: string; transactionId: string | null; reason: string };
  // ── Cuenta (autenticación) ──
  /** `actionUrl` lleva el token de un solo uso: NUNCA se escribe en logs ni auditoría. */
  email_verification: { name?: string | null; actionUrl: string; expiresHours: number };
  password_reset: { name?: string | null; actionUrl: string; expiresMinutes: number };
  /** Aviso de seguridad: la contraseña cambió (no contiene ninguna contraseña). */
  password_changed: { name?: string | null };
  /** Invitación al equipo. `actionUrl` lleva el token de un solo uso: NUNCA se escribe en logs ni auditoría. */
  staff_invitation: { actionUrl: string; expiresHours: number; invitedByName?: string | null };
};

export type EmailEvent = keyof EmailEventMap;

export type EmailRequest<E extends EmailEvent = EmailEvent> = {
  event: E;
  to: string;
  data: EmailEventMap[E];
};
