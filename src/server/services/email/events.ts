import type { CurrencyCode } from "@/domain/money";

/** Datos mínimos que necesita cualquier email de un pedido. */
export type OrderEmailData = {
  orderNumber: string;
  customerName?: string | null;
  total: number;
  currency: CurrencyCode;
};

/**
 * Eventos de email de la tienda y los datos que necesita cada uno.
 * Agregar un evento = agregar una entrada aquí (TypeScript obliga a
 * proveer sus datos al enviarlo).
 */
export type EmailEventMap = {
  order_received: OrderEmailData;
  payment_confirmed: OrderEmailData;
  order_preparing: OrderEmailData;
  order_shipped: OrderEmailData & {
    carrier: string;
    trackingNumber: string;
    trackingUrl?: string | null;
  };
  order_delivered: OrderEmailData;
  order_cancelled: OrderEmailData;
  refund_issued: OrderEmailData & { refundAmount: number };
  admin_new_order: OrderEmailData & { customerEmail: string };
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
