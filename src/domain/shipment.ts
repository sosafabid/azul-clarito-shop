/**
 * Envío manual: validación de la guía (courier, número y enlace de seguimiento). Reglas puras.
 * Marcar un pedido como ENVIADO exige el número de guía: es lo que se le manda al cliente por correo.
 */
export type ShipmentFields = { carrier: string | null; trackingNumber: string | null; trackingUrl: string | null };
export type ShipmentResult = { ok: true; value: ShipmentFields } | { ok: false; message: string };

const clean = (value: string | null | undefined, max: number): string | null => {
  const text = (value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return text === "" ? null : text;
};

export function parseShipment(raw: { carrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null }, opts: { requireTracking: boolean }): ShipmentResult {
  const carrier = clean(raw.carrier, 80);
  const trackingNumber = clean(raw.trackingNumber, 120);
  const trackingUrl = clean(raw.trackingUrl, 500);
  if (opts.requireTracking && (trackingNumber === null || trackingNumber.length < 3)) return { ok: false, message: "Escribí el número de guía para marcar el pedido como enviado: es lo que le llega al cliente por correo." };
  if (trackingUrl !== null && !/^https?:\/\/[^\s]+$/i.test(trackingUrl)) return { ok: false, message: "El enlace de seguimiento debe empezar con http:// o https://." };
  return { ok: true, value: { carrier, trackingNumber, trackingUrl } };
}

/**
 * Clave del correo de envío: la misma guía no se avisa dos veces, pero una guía corregida (otro número, courier o enlace) sí genera un correo nuevo.
 * Hash FNV-1a corto: la clave se guarda en `order_notifications.event` (único por pedido + evento).
 */
export function shipmentEmailKey(fields: ShipmentFields): string {
  const text = `${fields.carrier ?? ""}|${fields.trackingNumber ?? ""}|${fields.trackingUrl ?? ""}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `order_shipped:${hash.toString(16).padStart(8, "0")}`;
}
