import type { OrderStatus } from "@/domain/order-status";
import type { AddressSnapshot } from "@/types/address";

/**
 * Contrato de pedidos. (Implementación pendiente.)
 *
 * Crear un pedido COPIA nombre, SKU, precio y costo de cada producto a
 * `order_items` (snapshot): el pedido no cambia si el catálogo cambia después.
 * El número de pedido sale de la secuencia `order_number_seq`
 * (`SELECT nextval('order_number_seq')`) + `formatOrderNumber()`.
 */
export type CreateOrderLine = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

export type CreateOrderInput = {
  userId?: string | null;
  email: string;
  customerName?: string | null;
  customerPhone?: string | null;
  lines: readonly CreateOrderLine[];
  shippingMethodId: string;
  shippingAddress: AddressSnapshot;
  billingAddress?: AddressSnapshot | null;
  customerNotes?: string | null;
};

export type CreatedOrder = {
  orderId: string;
  orderNumber: string;
  total: number;
  currency: string;
};

export interface OrderService {
  create(input: CreateOrderInput): Promise<CreatedOrder>;
  /** Valida con `assertOrderTransition` antes de cambiar el estado. */
  changeStatus(orderId: string, to: OrderStatus, actorUserId: string | null): Promise<void>;
}
