/**
 * Envíos (reglas puras, sin base de datos).
 *
 * OPERACIÓN ACTUAL: la tienda envía SOLO dentro de Costa Rica y la logística es MANUAL (se prepara el
 * paquete y se lleva a Correos de Costa Rica u otro servicio; el tracking se anota a mano en el panel).
 * La clienta ve un único método conceptual, "Envío nacional", con la tarifa que Azul Clarito configure.
 *
 * Un MÉTODO tiene TARIFAS por zona. Para un destino se elige la tarifa más específica (código postal,
 * ciudad/cantón, provincia, "todo el país") dentro del rango de monto de pedido; si el pedido llega al umbral de
 * envío gratis de esa tarifa, el envío cuesta 0. No hay tarifas ni zonas precargadas: se definen en el panel.
 */
export const SHIPPING_TYPES = ["DELIVERY", "PICKUP"] as const;
export type ShippingType = (typeof SHIPPING_TYPES)[number];
export const SHIPPING_TYPE_LABELS: Record<ShippingType, string> = { DELIVERY: "Entrega a domicilio", PICKUP: "Retiro en persona" };

/** Único país al que se envía por ahora. */
export const STORE_COUNTRY = "CR";
export const STORE_COUNTRY_NAME = "Costa Rica";
export const COUNTRY_ONLY_MESSAGE = "Por ahora realizamos envíos únicamente dentro de Costa Rica.";

/** Provincias de Costa Rica (dato geográfico para los selectores; NO son tarifas). */
export const CR_PROVINCES = ["San José", "Alajuela", "Cartago", "Heredia", "Guanacaste", "Puntarenas", "Limón"] as const;

export type Destination = { country: string; province: string | null; city: string | null; postalCode: string | null };

export type RateCandidate = {
  id: string;
  methodId: string;
  countryCode: string | null;
  stateProvince: string | null;
  city: string | null;
  postalCode: string | null;
  price: number;
  currency: string;
  minOrderAmount: number | null;
  maxOrderAmount: number | null;
  freeShippingThreshold: number | null;
};

/** Compara texto de zonas sin importar mayúsculas, tildes ni espacios sobrantes ("San José" = "san jose"). */
export function normalizeZone(value: string | null | undefined): string {
  return (value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Una zona puede listar VARIOS valores separados por ";" (p. ej. los cantones que componen la GAM):
 * "Escazú; Santa Ana; Curridabat". Coincide si el destino es cualquiera de ellos.
 */
export function splitZoneValues(value: string | null | undefined): string[] {
  return (value ?? "").split(/[;|]/).map((part) => normalizeZone(part)).filter((part) => part !== "");
}

/** Cuántos campos de zona concreta coinciden (más = más específica). `null` = no aplica a este destino. */
export function rateSpecificity(rate: RateCandidate, destination: Destination): number | null {
  let score = 0;
  if (rate.countryCode !== null) {
    if (rate.countryCode.toUpperCase() !== destination.country.toUpperCase()) return null;
    score += 1;
  }
  for (const [rateValue, destValue] of [
    [rate.stateProvince, destination.province],
    [rate.city, destination.city],
    [rate.postalCode, destination.postalCode],
  ] as const) {
    const allowed = splitZoneValues(rateValue);
    if (allowed.length === 0) continue;
    if (!allowed.includes(normalizeZone(destValue))) return null;
    score += 1;
  }
  return score;
}

export type ResolvedRate = { rate: RateCandidate; amount: number; free: boolean };

/**
 * Tarifa que corresponde a un destino y a un monto de pedido, o `null` si no hay ninguna.
 * Moneda: la tarifa debe estar en la moneda del carrito (no hay conversión).
 */
export function resolveRate(rates: readonly RateCandidate[], destination: Destination, orderAmount: number, currency: string): ResolvedRate | null {
  let best: { rate: RateCandidate; score: number } | null = null;
  for (const rate of rates) {
    if (rate.currency !== currency) continue;
    if (rate.minOrderAmount !== null && orderAmount < rate.minOrderAmount) continue;
    if (rate.maxOrderAmount !== null && orderAmount > rate.maxOrderAmount) continue;
    const score = rateSpecificity(rate, destination);
    if (score === null) continue;
    // Gana la más específica; si empatan, la de menor precio.
    if (!best || score > best.score || (score === best.score && rate.price < best.rate.price)) best = { rate, score };
  }
  if (!best) return null;
  const free = best.rate.freeShippingThreshold !== null && orderAmount >= best.rate.freeShippingThreshold;
  return { rate: best.rate, amount: free ? 0 : best.rate.price, free };
}

const clean = (value: string | undefined, max: number): string | null => {
  const text = (value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return text === "" ? null : text;
};

export type ParsedDestination = {
  /** `null` mientras falte una provincia válida. El país SIEMPRE es Costa Rica. */
  destination: Destination | null;
  /** El navegador mandó un país distinto de CR (request manipulada): se rechaza. */
  countryRejected: boolean;
};

/**
 * Destino que escribió la persona en el checkout (llega por la URL: NO es confiable).
 *  - País: solo Costa Rica. Si llega otro (el formulario ya no lo envía), se RECHAZA.
 *  - Provincia: debe ser una de las 7 de Costa Rica (se normaliza al nombre oficial).
 */
export function parseDestination(raw: { pais?: string; provincia?: string; ciudad?: string; cp?: string }): ParsedDestination {
  const country = (raw.pais ?? "").trim().toUpperCase();
  if (country !== "" && country !== STORE_COUNTRY) return { destination: null, countryRejected: true };
  const wanted = normalizeZone(clean(raw.provincia, 80));
  const province = CR_PROVINCES.find((name) => normalizeZone(name) === wanted) ?? null;
  if (!province) return { destination: null, countryRejected: false };
  return { destination: { country: STORE_COUNTRY, province, city: clean(raw.ciudad, 80), postalCode: clean(raw.cp, 20) }, countryRejected: false };
}
