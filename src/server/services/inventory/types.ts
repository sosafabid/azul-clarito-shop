import type { StockLevels } from "@/domain/stock";

/**
 * Contrato de inventario. (Implementación pendiente.)
 *
 * Las reglas de cálculo están en `src/domain/stock.ts`. La implementación real
 * debe ejecutar cada cambio como UNA sentencia atómica y condicionada (ver el
 * comentario de ese archivo) para evitar overselling.
 */
export type StockTarget = {
  productId: string;
  variantId?: string | null;
};

export type StockReservationRequest = StockTarget & { quantity: number };

export interface InventoryService {
  getLevels(target: StockTarget): Promise<StockLevels | null>;
  /** available → reserved. Falla con `InsufficientStockError` si no hay stock. */
  reserve(requests: readonly StockReservationRequest[]): Promise<void>;
  /** reserved → available (pago fallido, checkout abandonado). */
  release(requests: readonly StockReservationRequest[]): Promise<void>;
  /** reserved → sold (pago confirmado). */
  commit(requests: readonly StockReservationRequest[]): Promise<void>;
}
