/**
 * Envíos (reglas puras, sin base de datos).
 *
 * Un MÉTODO (Envío estándar, Retiro…) tiene TARIFAS por zona. Para un destino se elige la tarifa
 * más específica (provincia/ciudad/código postal > país > "cualquier país") dentro del rango de
 * monto de pedido; si el pedido llega al umbral de envío gratis de esa tarifa, el envío cuesta 0.
 * No hay tarifas precargadas: se definen en el panel.
 */
export const SHIPPING_TYPES = ["DELIVERY", "PICKUP"] as const;
export type ShippingType = (typeof SHIPPING_TYPES)[number];
export const SHIPPING_TYPE_LABELS: Record<ShippingType, string> = { DELIVERY: "Entrega a domicilio", PICKUP: "Retiro en persona" };

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
    if (rateValue === null || rateValue.trim() === "") continue;
    if (normalizeZone(rateValue) !== normalizeZone(destValue)) return null;
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

/** Código de país ISO 3166-1 alfa-2 (los que usa la tienda para elegir destino). */
export const COUNTRY_CODES =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");

export const isCountryCode = (value: string) => /^[A-Z]{2}$/.test(value) && COUNTRY_CODES.includes(value);

export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["es"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

const clean = (value: string | undefined, max: number): string | null => {
  const text = (value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return text === "" ? null : text;
};

/** Destino que escribió la persona en el checkout (llega por la URL: se trata como NO confiable y se normaliza). */
export function parseDestination(raw: { pais?: string; provincia?: string; ciudad?: string; cp?: string }): Destination | null {
  const country = (raw.pais ?? "").trim().toUpperCase();
  if (!isCountryCode(country)) return null;
  return { country, province: clean(raw.provincia, 80), city: clean(raw.ciudad, 80), postalCode: clean(raw.cp, 20) };
}
