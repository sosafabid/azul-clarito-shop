/**
 * Contrato del carrito. (Implementación pendiente.)
 *
 * REGLA DE SEGURIDAD: el carrito guarda SOLO ids y cantidades. Los precios, el
 * nombre y la disponibilidad se vuelven a leer de la base de datos en el
 * servidor al mostrar el carrito y, sobre todo, al hacer checkout. Nunca se
 * confía en un precio que venga del navegador.
 *
 * Decisión pendiente: dónde persistir (cookie firmada para invitadas + tabla
 * para clientas con sesión, o solo cookie). No afecta al resto del recorrido.
 */
export type CartLine = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

export type Cart = {
  lines: readonly CartLine[];
};

export interface CartService {
  get(): Promise<Cart>;
  addLine(line: CartLine): Promise<Cart>;
  setQuantity(line: Pick<CartLine, "productId" | "variantId">, quantity: number): Promise<Cart>;
  removeLine(line: Pick<CartLine, "productId" | "variantId">): Promise<Cart>;
  clear(): Promise<void>;
}
