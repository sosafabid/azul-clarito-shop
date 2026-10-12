/**
 * TIPO DE PRODUCTO Y ENTREGA DIGITAL — reglas puras (sin base de datos ni red).
 *
 * El tipo es un campo EXPLÍCITO de cada producto (no se deduce de la categoría: un libro puede ser físico o digital).
 *   PHYSICAL → tiene inventario, se envía y paga envío.
 *   DIGITAL  → no tiene inventario ni envío; se entrega con un enlace temporal DESPUÉS de que el pago esté confirmado.
 */
export const PRODUCT_TYPES = ["PHYSICAL", "DIGITAL"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  PHYSICAL: "Físico (se envía)",
  DIGITAL: "Digital (descarga en PDF)",
};

export const isProductType = (value: unknown): value is ProductType => typeof value === "string" && (PRODUCT_TYPES as readonly string[]).includes(value);

/** Un libro digital se compra una sola vez por pedido: no tiene sentido llevar 2 copias del mismo archivo. */
export const DIGITAL_MAX_QUANTITY = 1;

/** Archivo digital: solo PDF, con un tope razonable. */
export const DIGITAL_FILE = {
  contentType: "application/pdf",
  maxBytes: 50 * 1024 * 1024,
  /** Prefijo privado dentro del almacenamiento (nunca se publica su URL). */
  keyPrefix: "digital",
} as const;

/** Un PDF empieza con "%PDF-" (la firma se comprueba por contenido, no por el nombre ni el tipo que declara el navegador). */
export function looksLikePdf(head: Uint8Array): boolean {
  return head.length >= 5 && head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46 && head[4] === 0x2d;
}

/** Nombre de descarga seguro (sin rutas, comillas ni caracteres de control) que siempre termina en .pdf. */
export function safeDownloadName(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\.pdf$/i, "")
    .replace(/[^A-Za-z0-9._ -]+/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .replace(/^[.\s-]+/, "")
    .trim()
    .slice(0, 80);
  return `${base || "libro"}.pdf`;
}

/** Clave de almacenamiento: impredecible (UUID) y sin el nombre original del archivo. */
export function digitalStorageKey(productId: string, uuid: string): string {
  return `${DIGITAL_FILE.keyPrefix}/${productId}/${uuid}.pdf`;
}

export const DOWNLOAD_PURPOSES = ["EMAIL", "PAGE", "RECOVERY"] as const;
export type DownloadPurpose = (typeof DOWNLOAD_PURPOSES)[number];

/**
 * Vigencia y tope de cada tipo de enlace. Son TEMPORALES: cuando vencen, la clienta pide uno nuevo (desde la página de su
 * pedido o con "Recuperar mi compra"); el acceso a lo que pagó no vence, solo cada enlace.
 *   EMAIL    → el que llega por correo al confirmarse el pago.
 *   PAGE     → el que se muestra en la página del pedido (corto: se vuelve a generar al recargar).
 *   RECOVERY → el que llega por correo al pedir recuperar la compra.
 */
export const DOWNLOAD_LINK_RULES: Record<DownloadPurpose, { ttlMinutes: number; maxDownloads: number }> = {
  EMAIL: { ttlMinutes: 72 * 60, maxDownloads: 10 },
  PAGE: { ttlMinutes: 15, maxDownloads: 5 },
  RECOVERY: { ttlMinutes: 24 * 60, maxDownloads: 5 },
};

/** Tope de enlaces de página que se generan por libro y por día (frena a quien recargue en bucle). */
export const MAX_PAGE_LINKS_PER_ITEM_PER_DAY = 24;
/** Correos de recuperación por pedido y por día. */
export const MAX_RECOVERY_EMAILS_PER_ORDER_PER_DAY = 3;

/** Token del enlace: 32 bytes aleatorios en base64url (43 caracteres). Solo se guarda su hash. */
export const DOWNLOAD_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** Estados de pedido en los que el pago YA está confirmado (la descarga se habilita solo en estos). */
export const PAID_ORDER_STATUSES = ["PAID", "PREPARING", "PACKED", "SHIPPED", "DELIVERED"] as const;

export type FulfillmentMix = "digital_only" | "physical_only" | "mixed" | "empty";

export function fulfillmentMix(types: readonly ProductType[]): FulfillmentMix {
  if (types.length === 0) return "empty";
  const digital = types.filter((t) => t === "DIGITAL").length;
  return digital === types.length ? "digital_only" : digital === 0 ? "physical_only" : "mixed";
}

/** Resultado de la prueba de punta a punta del almacén privado de PDF (botón "Probar almacenamiento" del panel). */
export type StorageProbeStep = { name: string; ok: boolean; detail?: string };
export type StorageProbe = { ok: boolean; message: string; steps: StorageProbeStep[] };
