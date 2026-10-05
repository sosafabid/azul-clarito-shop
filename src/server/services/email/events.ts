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
};

export type EmailEvent = keyof EmailEventMap;

export type EmailRequest<E extends EmailEvent = EmailEvent> = {
  event: E;
  to: string;
  data: EmailEventMap[E];
};
