import type { Cart } from "../cart/types";
import type { CreatePaymentResult } from "../payments/types";
import type { AddressSnapshot } from "@/types/address";

/**
 * Orquestador del checkout. (Implementación pendiente.)
 *
 * Es el ÚNICO lugar que conoce el orden completo del recorrido:
 *   1. releer productos y precios desde la base de datos (nunca del navegador)
 *   2. reservar stock                      → inventory
 *   3. crear el pedido con snapshots       → orders
 *   4. pedir el pago al proveedor activo   → payments
 *   5. si algo falla, liberar el stock
 * Las demás etapas no se llaman entre sí.
 */
export type CheckoutInput = {
  cart: Cart;
  email: string;
  customerName?: string | null;
  customerPhone?: string | null;
  shippingMethodId: string;
  shippingAddress: AddressSnapshot;
  customerNotes?: string | null;
};

export type CheckoutResult = {
  orderId: string;
  orderNumber: string;
  payment: CreatePaymentResult;
};

export interface CheckoutService {
  start(input: CheckoutInput): Promise<CheckoutResult>;
}
