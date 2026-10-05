import type { AddressSnapshot } from "@/types/address";

/**
 * Contrato de cálculo de envío. (Implementación pendiente.)
 *
 * Versión 1 = MANUAL: la tarifa sale de la tabla `shipping_rates` (definida
 * por management), eligiendo la regla MÁS específica que coincida con la
 * dirección: código postal > ciudad > provincia > país. Sin APIs de Correos de
 * Costa Rica, DHL, UPS, FedEx ni ningún otro transportista.
 */
export type ShippingQuote = {
  methodId: string;
  methodCode: string;
  methodName: string;
  carrier: string | null;
  price: number;
  currency: string;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
};

export interface ShippingService {
  quote(address: AddressSnapshot): Promise<readonly ShippingQuote[]>;
}
