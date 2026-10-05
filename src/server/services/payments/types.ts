import type { CurrencyCode } from "@/domain/money";
import type { PaymentStatus } from "@/domain/payments";

/**
 * Contrato de un proveedor de pagos.
 *
 * Es deliberadamente GENÉRICO: no asume Stripe ni ningún proveedor concreto.
 * Pedidos, carrito y checkout solo conocen esta interfaz; para integrar un
 * proveedor compatible con Costa Rica se escribe un adaptador que la
 * implemente y se registra en `registry.ts`.
 *
 * Montos: enteros en la unidad definida en `src/domain/money.ts`. Si el
 * proveedor espera otra unidad, la conversión ocurre dentro del adaptador.
 */
export type CreatePaymentInput = {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: CurrencyCode;
  customerEmail: string;
  /** A dónde vuelve la clienta después de pagar (si el proveedor redirige). */
  returnUrl: string;
};

export type CreatePaymentResult = {
  /** Id de la transacción en el proveedor. */
  providerReference: string;
  status: PaymentStatus;
  /** Si el proveedor requiere redirigir a una página de pago. */
  redirectUrl?: string;
  /** Si el proveedor usa un secreto de cliente para un formulario embebido. */
  clientSecret?: string;
};

export type PaymentWebhookEvent = {
  type: "payment.succeeded" | "payment.failed" | "payment.cancelled" | "payment.refunded";
  providerReference: string;
  amount?: number;
  currency?: CurrencyCode;
  occurredAt: Date;
};

export type RefundInput = {
  providerReference: string;
  /** Vacío = reembolso total. */
  amount?: number;
  reason?: string;
};

export interface PaymentProvider {
  /** Identificador estable, se guarda en `payments.provider`. */
  readonly id: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  /**
   * Verifica la FIRMA del webhook con el secreto del proveedor y lo traduce a
   * un evento genérico. Debe lanzar un error si la firma no es válida.
   */
  parseWebhook(input: { headers: Headers; rawBody: string }): Promise<PaymentWebhookEvent>;
  refund(input: RefundInput): Promise<{ providerRefundReference: string }>;
}
