import type { LineStatus } from "@/domain/cart";

/**
 * Contrato del carrito.
 *
 * REGLA DE SEGURIDAD: el carrito guarda SOLO ids y cantidades. Precio, nombre,
 * imagen y disponibilidad se vuelven a leer de la base de datos en el servidor cada
 * vez que se muestra o se modifica. Nunca se confía en un precio que venga del
 * navegador, y el COSTO jamás sale de la base hacia el carrito.
 *
 * Agregar al carrito NO reserva stock. La reserva ocurrirá en el checkout.
 */
export type CartOwner = { kind: "user"; userId: string } | { kind: "guest"; tokenHash: string };

export type CartLineView = {
  id: string;
  productId: string;
  variantId: string | null;
  slug: string;
  sku: string;
  name: string;
  variantLabel: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  quantity: number;
  /** Precio público ACTUAL (leído de la base ahora mismo). Entero en la unidad mínima de la moneda. */
  unitPrice: number;
  lineTotal: number;
  currency: string;
  status: LineStatus;
  /** Tope para el botón "+": lo disponible, con máximo general (nunca más de 20). */
  maxQuantity: number;
  /** Unidades disponibles, SOLO cuando hay menos que las del carrito (para el mensaje "solo quedan N"). */
  availableNow: number | null;
};

export type CartView = {
  lines: CartLineView[];
  currency: string | null;
  /** Suma de las líneas que se pueden comprar tal cual. */
  subtotal: number;
  /** Total de unidades en el carrito (lo que muestra el contador del header). */
  totalUnits: number;
  /** Hay líneas que requieren atención (ya no disponibles o con stock insuficiente). */
  hasIssues: boolean;
};

export type CartMutation =
  | { ok: true; quantity: number; limited: boolean; message: string }
  | { ok: false; code: string; message: string };

/**
 * Forma mínima de un carrito (solo ids y cantidades) que usa el contrato de checkout, todavía
 * sin implementar. El checkout deberá volver a validar precio, stock y estado desde la base.
 */
export type Cart = {
  lines: readonly { productId: string; variantId?: string | null; quantity: number }[];
};
