/**
 * Dirección tal como se guarda en un pedido (snapshot).
 *
 * Un pedido NO apunta a la tabla `addresses`: copia la dirección. Así, si la
 * clienta edita o borra su dirección después, el pedido conserva a dónde se
 * envió realmente.
 */
export type AddressSnapshot = {
  recipientName: string;
  phone?: string | null;
  /** ISO 3166-1 alpha-2, p. ej. "CR". */
  countryCode: string;
  /** Provincia / estado. */
  stateProvince: string;
  /** Cantón / ciudad. */
  city: string;
  /** Distrito (relevante en Costa Rica). */
  district?: string | null;
  postalCode?: string | null;
  line1: string;
  line2?: string | null;
  deliveryNotes?: string | null;
};
