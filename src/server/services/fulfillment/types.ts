/**
 * Contrato de preparación y entrega (fulfillment). (Implementación pendiente.)
 *
 * En la primera versión el envío es MANUAL: management prepara el pedido y
 * registra carrier y número de guía a mano. Cada cambio debe:
 *   - validar la transición con `assertOrderTransition`
 *   - registrar una fila en `audit_logs`
 *   - disparar el email correspondiente (`email/`)
 */
export type ShipmentInfo = {
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string | null;
};

export interface FulfillmentService {
  markPreparing(orderId: string, actorUserId: string): Promise<void>;
  markShipped(orderId: string, shipment: ShipmentInfo, actorUserId: string): Promise<void>;
  markDelivered(orderId: string, actorUserId: string): Promise<void>;
}
