/**
 * Reglas puras del carrito (sin base de datos ni cookies).
 *
 * Recordatorio de diseño: el carrito guarda SOLO ids y cantidades. Precio, nombre y
 * disponibilidad se leen de la base en cada vista, y agregar al carrito NO reserva stock.
 */
export const MAX_QUANTITY_PER_LINE = 20;
export const MAX_CART_LINES = 30;
export const GUEST_CART_DAYS = 30;
/** Token de invitada: 32 bytes aleatorios en base64url (43 caracteres). */
export const CART_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type QuantityResult = { ok: true; value: number } | { ok: false; error: string };

/** Cantidad pedida por la persona: entero ≥ 1. Rechaza 0, negativos, decimales, notación científica y texto. */
export function parseQuantity(raw: unknown): QuantityResult {
  const text = typeof raw === "number" ? (Number.isFinite(raw) ? String(raw) : "") : typeof raw === "string" ? raw.trim() : "";
  if (!/^\d+$/.test(text)) return { ok: false, error: "La cantidad tiene que ser un número entero, de 1 en adelante." };
  const value = Number(text);
  if (value < 1) return { ok: false, error: "La cantidad mínima es 1." };
  if (value > 999) return { ok: false, error: "Esa cantidad es demasiado grande." };
  return { ok: true, value };
}

/** Tope de unidades que se pueden tener de una línea: lo que hay disponible, con un máximo general. */
export function maxPurchasable(available: number): number {
  return Math.max(0, Math.min(available, MAX_QUANTITY_PER_LINE));
}

export type QuantityLimit = { quantity: number; limited: false } | { quantity: number; limited: true; by: "stock" | "max" };

/** Limita lo pedido a lo disponible (y al máximo por línea), diciendo por qué. */
export function limitQuantity(desired: number, available: number): QuantityLimit {
  const cap = maxPurchasable(available);
  if (desired <= cap) return { quantity: desired, limited: false };
  return { quantity: cap, limited: true, by: available < MAX_QUANTITY_PER_LINE ? "stock" : "max" };
}

export function limitMessage(limit: Extract<QuantityLimit, { limited: true }>): string {
  if (limit.by === "stock") {
    return limit.quantity === 1 ? "Solo hay 1 unidad disponible. Dejamos 1 en tu carrito." : `Solo hay ${limit.quantity} unidades disponibles. Dejamos ${limit.quantity} en tu carrito.`;
  }
  return `El máximo por producto es ${MAX_QUANTITY_PER_LINE} unidades. Dejamos ${limit.quantity} en tu carrito.`;
}

/**
 * Estado de una línea al volver a validarla contra la base:
 *  ok           → se puede comprar la cantidad que tiene.
 *  insufficient → hay stock pero menos que la cantidad del carrito (hay que ajustar).
 *  unavailable  → ya no se puede comprar (oculto, archivado, variante inactiva o sin stock).
 */
export type LineStatus = "ok" | "insufficient" | "unavailable";

export function lineStatus(input: { purchasable: boolean; available: number; quantity: number }): LineStatus {
  if (!input.purchasable || input.available <= 0) return "unavailable";
  return input.quantity > input.available ? "insufficient" : "ok";
}

export const lineKey = (productId: string, variantId: string | null) => `${productId}:${variantId ?? "-"}`;

export const lineTotal = (unitPrice: number, quantity: number) => unitPrice * quantity;

/** Subtotal: SOLO las líneas que se pueden comprar tal cual (las que requieren atención no suman). */
export function subtotal(lines: readonly { status: LineStatus; unitPrice: number; quantity: number }[]): number {
  return lines.filter((l) => l.status === "ok").reduce((sum, l) => sum + lineTotal(l.unitPrice, l.quantity), 0);
}

/** Contador del header: total de UNIDADES (no de productos distintos). */
export const totalUnits = (lines: readonly { quantity: number }[]) => lines.reduce((sum, l) => sum + l.quantity, 0);

/**
 * Al fusionar el carrito de invitada con el de la cuenta: se suman las cantidades sin pasar
 * del stock disponible. Si ya no hay stock, la línea se conserva (con tope general) para que
 * la persona vea que ya no está disponible, en vez de desaparecer en silencio.
 */
export function mergedQuantity(guestQuantity: number, userQuantity: number, available: number): number {
  const sum = guestQuantity + userQuantity;
  const cap = available > 0 ? maxPurchasable(available) : MAX_QUANTITY_PER_LINE;
  return Math.max(1, Math.min(sum, cap));
}

/**
 * Cómo se llama una variante para la clienta: "Talla: M · Color: Azul". Si quien administra le puso un nombre
 * propio (distinto del que se arma solo con las opciones), se respeta ese nombre.
 */
export function variantLabel(variant: { name: string | null; options: Record<string, string> | null; sku?: string | null }): string {
  const entries = Object.entries(variant.options ?? {});
  const name = (variant.name ?? "").trim();
  if (entries.length > 0) {
    // PostgreSQL (jsonb) no conserva el orden en que se escribieron las opciones, así que el nombre
    // automático ("M / Azul") se reconoce por contener EXACTAMENTE los valores, en cualquier orden.
    const parts = name.split("/").map((part) => part.trim());
    const sameValues = [...parts].sort().join("\u0000") === entries.map(([, value]) => value).sort().join("\u0000");
    if (name === "" || sameValues) {
      // Se respeta el orden en que aparecen en el nombre ("Talla" antes que "Color" si el nombre es "M / Azul").
      const position = (value: string) => (parts.indexOf(value) === -1 ? Number.MAX_SAFE_INTEGER : parts.indexOf(value));
      return [...entries].sort((a, b) => position(a[1]) - position(b[1])).map(([key, value]) => `${key}: ${value}`).join(" · ");
    }
  }
  return name || variant.sku || "Opción";
}
