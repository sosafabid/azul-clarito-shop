/**
 * Medición: reglas PURAS (sin navegador, sin base de datos) para poder probarlas.
 *  - Montos: siempre los reales de la tienda, en la moneda real (CRC), sin conversiones. `value` = subtotal de productos
 *    (sin envío ni impuestos); el envío y el impuesto se mandan aparte.
 *  - Privacidad: aquí solo se construyen datos de producto y de pedido. Nunca nombre, correo, teléfono, dirección ni datos de pago.
 *  - Consentimiento: cookie propia `ac_consent` con la versión, la decisión y la fecha.
 */
import { fromMinorUnits, toCurrency } from "@/domain/money";

// ── IDs de medición ────────────────────────────────────────────────────────────────────────────────────────────
export function parseGaMeasurementId(raw: string | undefined | null): string | null {
  const value = (raw ?? "").trim();
  return /^G-[A-Z0-9]{6,14}$/.test(value) ? value : null;
}
export function parseMetaPixelId(raw: string | undefined | null): string | null {
  const value = (raw ?? "").trim();
  return /^\d{8,20}$/.test(value) ? value : null;
}

// ── Productos ──────────────────────────────────────────────────────────────────────────────────────────────────
export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_category?: string;
  item_variant?: string;
  item_list_name?: string;
  index?: number;
};

export type AnalyticsItemInput = {
  /** SKU del PRODUCTO (no de la variante): así el embudo (lista → ficha → carrito → compra) usa siempre el mismo id. */
  sku: string;
  name: string;
  /** Entero en unidad mínima de la moneda (como se guarda). Se convierte aquí a la cifra "humana" que espera GA4. */
  unitPrice: number;
  currency: string;
  quantity?: number;
  category?: string | null;
  variant?: string | null;
  listName?: string;
  index?: number;
};

export function analyticsItem(input: AnalyticsItemInput): AnalyticsItem {
  const item: AnalyticsItem = {
    item_id: input.sku,
    item_name: input.name,
    price: fromMinorUnits(input.unitPrice, toCurrency(input.currency)),
    quantity: input.quantity ?? 1,
  };
  if (input.category) item.item_category = input.category;
  if (input.variant) item.item_variant = input.variant;
  if (input.listName) item.item_list_name = input.listName;
  if (input.index !== undefined) item.index = input.index;
  return item;
}

/** Suma de precio × cantidad, con los decimales de la moneda (sin errores de coma flotante). */
export function itemsValue(items: readonly AnalyticsItem[], currency: string): number {
  const decimals = toCurrency(currency) === "USD" ? 2 : 0;
  const factor = 10 ** decimals;
  const cents = items.reduce((sum, item) => sum + Math.round(item.price * factor) * item.quantity, 0);
  return cents / factor;
}

// ── Compra ─────────────────────────────────────────────────────────────────────────────────────────────────────
export type PurchasePayload = {
  transaction_id: string;
  currency: string;
  value: number;
  tax: number;
  shipping: number;
  items: AnalyticsItem[];
};

export type PurchaseSource = {
  orderNumber: string;
  currency: string;
  subtotal: number;
  taxTotal: number;
  shippingTotal: number;
  items: { sku: string; name: string; unitPrice: number; quantity: number; variant?: string | null; category?: string | null }[];
};

/** Datos de la compra a partir del PEDIDO guardado (nunca de la URL ni del navegador). */
export function buildPurchasePayload(order: PurchaseSource): PurchasePayload {
  const items = order.items.map((line) => analyticsItem({ sku: line.sku, name: line.name, unitPrice: line.unitPrice, currency: order.currency, quantity: line.quantity, variant: line.variant, category: line.category }));
  const currency = toCurrency(order.currency);
  return {
    transaction_id: order.orderNumber,
    currency,
    value: fromMinorUnits(order.subtotal, currency),
    tax: fromMinorUnits(order.taxTotal, currency),
    shipping: fromMinorUnits(order.shippingTotal, currency),
    items,
  };
}

/** Ventana en la que un pedido pagado todavía se puede medir (al volver al enlace de la compra días después no se vuelve a contar). */
export const PURCHASE_WINDOW_HOURS = 24;

/** Solo un pedido CONFIRMADO como pagado y reciente se mide; pendiente, fallido o cancelado, nunca. */
export function isPurchaseTrackable(input: { view: string; paidAt: Date | null; now: Date }): boolean {
  if (input.view !== "paid" || !input.paidAt) return false;
  const ageMs = input.now.getTime() - input.paidAt.getTime();
  return ageMs >= 0 && ageMs <= PURCHASE_WINDOW_HOURS * 3_600_000;
}

// ── Consentimiento ─────────────────────────────────────────────────────────────────────────────────────────────
export const CONSENT_COOKIE = "ac_consent";
export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE_DAYS = 180;

export type ConsentChoice = { analytics: boolean; marketing: boolean };
export type StoredConsent = ConsentChoice & { decidedAt: number };

/** `v1.<analítica 0/1><publicidad 0/1>.<segundos desde 1970>` */
export function serializeConsent(choice: ConsentChoice, now: Date): string {
  return `v${CONSENT_VERSION}.${choice.analytics ? 1 : 0}${choice.marketing ? 1 : 0}.${Math.floor(now.getTime() / 1000)}`;
}

/** Una decisión de otra versión, mal formada o vencida (más de 180 días) cuenta como "sin decidir": se vuelve a preguntar. */
export function parseConsent(raw: string | null | undefined, now: Date): StoredConsent | null {
  const match = /^v(\d+)\.([01])([01])\.(\d{9,11})$/.exec(raw ?? "");
  if (!match || Number(match[1]) !== CONSENT_VERSION) return null;
  const decidedAt = Number(match[4]);
  const ageDays = (now.getTime() / 1000 - decidedAt) / 86_400;
  if (ageDays < -1 || ageDays > CONSENT_MAX_AGE_DAYS) return null;
  return { analytics: match[2] === "1", marketing: match[3] === "1", decidedAt };
}

// ── Privacidad de la URL ───────────────────────────────────────────────────────────────────────────────────────
/** Únicos parámetros de la URL que pueden viajar a las herramientas (filtros públicos del catálogo). El resto se descarta. */
const SAFE_QUERY_KEYS = ["categoria", "category", "coleccion", "collection"];

/**
 * La dirección que se envía a GA4 y Meta: sin parámetros salvo los filtros públicos. Así NUNCA viajan el enlace privado del
 * pedido (`?t=`), tokens de correo/recuperación ni la provincia, ciudad o código postal del checkout.
 */
export function sanitizePageLocation(href: string): string {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return "";
  }
  const kept = new URLSearchParams();
  for (const [key, value] of url.searchParams) if (SAFE_QUERY_KEYS.includes(key)) kept.set(key, value);
  const query = kept.toString();
  return `${url.origin}${url.pathname}${query ? `?${query}` : ""}`;
}

/** Rutas donde NO se mide la vista de página con el Pixel (cuentas, restablecimientos y recuperación de compra). */
export const NO_PAGEVIEW_PATHS = ["/account", "/reset-password", "/verify-email", "/verification-success", "/reset-success", "/staff-invitation", "/recuperar-compra", "/forgot-password"];
export function isSensitivePath(pathname: string): boolean {
  return NO_PAGEVIEW_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Huella corta y estable de un texto (para claves de "ya se midió"): no es criptográfica ni lleva datos legibles. */
export function shortSignature(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}
