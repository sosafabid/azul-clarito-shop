/**
 * Envíos (reglas puras, sin base de datos).
 *
 * OPERACIÓN ACTUAL: se envía dentro de Costa Rica (todo) y a América (solo merch, con tarifa por país). La logística es MANUAL (se prepara el
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

/** País de la tienda: todos los productos se envían aquí. */
export const STORE_COUNTRY = "CR";
export const STORE_COUNTRY_NAME = "Costa Rica";
export const COUNTRY_ONLY_MESSAGE = "Los productos que no son merch se envían únicamente dentro de Costa Rica.";

/**
 * ENVÍO INTERNACIONAL (solo América y solo merch).
 * Un producto se puede enviar al exterior si pertenece a la colección con este slug (se administra en el panel, en la ficha del producto).
 * El método de envío internacional (código fijo) tiene UNA tarifa por país; un país sin tarifa activa NO se puede elegir para comprar.
 */
export const INTERNATIONAL_COLLECTION_SLUG = "merch";
export const INTERNATIONAL_METHOD_CODE = "envio-internacional";
export const INTERNATIONAL_METHOD_NAME = "Envío internacional";

/** Países del continente americano (ISO 3166-1 alpha-2), sin Costa Rica. Orden alfabético en español. */
export const AMERICAS_COUNTRIES = [
  { code: "AG", name: "Antigua y Barbuda" }, { code: "AR", name: "Argentina" }, { code: "BS", name: "Bahamas" }, { code: "BB", name: "Barbados" },
  { code: "BZ", name: "Belice" }, { code: "BO", name: "Bolivia" }, { code: "BR", name: "Brasil" }, { code: "CA", name: "Canadá" },
  { code: "CL", name: "Chile" }, { code: "CO", name: "Colombia" }, { code: "CU", name: "Cuba" }, { code: "DM", name: "Dominica" },
  { code: "EC", name: "Ecuador" }, { code: "SV", name: "El Salvador" }, { code: "US", name: "Estados Unidos" }, { code: "GD", name: "Granada" },
  { code: "GT", name: "Guatemala" }, { code: "GY", name: "Guyana" }, { code: "HT", name: "Haití" }, { code: "HN", name: "Honduras" },
  { code: "JM", name: "Jamaica" }, { code: "MX", name: "México" }, { code: "NI", name: "Nicaragua" }, { code: "PA", name: "Panamá" },
  { code: "PY", name: "Paraguay" }, { code: "PE", name: "Perú" }, { code: "PR", name: "Puerto Rico" }, { code: "DO", name: "República Dominicana" },
  { code: "KN", name: "San Cristóbal y Nieves" }, { code: "VC", name: "San Vicente y las Granadinas" }, { code: "LC", name: "Santa Lucía" },
  { code: "SR", name: "Surinam" }, { code: "TT", name: "Trinidad y Tobago" }, { code: "UY", name: "Uruguay" }, { code: "VE", name: "Venezuela" },
] as const;

const AMERICAS_BY_CODE = new Map<string, string>(AMERICAS_COUNTRIES.map((c) => [c.code, c.name]));

export function isAmericasCountry(code: string | null | undefined): boolean {
  return AMERICAS_BY_CODE.has((code ?? "").toUpperCase());
}

/** Nombre en español de un país que la tienda atiende (Costa Rica o América); si no lo conoce, el código tal cual. */
export function countryName(code: string | null | undefined): string {
  const upper = (code ?? "").toUpperCase();
  return upper === STORE_COUNTRY ? STORE_COUNTRY_NAME : (AMERICAS_BY_CODE.get(upper) ?? upper);
}

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
  /** Texto de la tarifa para la clienta (envío internacional: mensajería y plazo). Viene de `zone_name`. */
  note?: string | null;
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
  /** `null` mientras falte lo mínimo para calcular: en Costa Rica, una provincia válida; en América, solo elegir el país. */
  destination: Destination | null;
  /** El navegador mandó un país que no es Costa Rica ni de América (request manipulada): se rechaza. */
  countryRejected: boolean;
};

/**
 * Destino que escribió la persona en el checkout (llega por la URL: NO es confiable).
 *  - País: Costa Rica (por defecto) o un país de América. Cualquier otro se RECHAZA.
 *  - Costa Rica: la provincia debe ser una de las 7 (se normaliza al nombre oficial).
 *  - América: el estado/provincia es texto libre; la tarifa se decide por país.
 */
export function parseDestination(raw: { pais?: string; provincia?: string; ciudad?: string; cp?: string }): ParsedDestination {
  const country = (raw.pais ?? "").trim().toUpperCase() || STORE_COUNTRY;
  if (country !== STORE_COUNTRY) {
    if (!isAmericasCountry(country)) return { destination: null, countryRejected: true };
    return { destination: { country, province: clean(raw.provincia, 80), city: clean(raw.ciudad, 80), postalCode: clean(raw.cp, 20) }, countryRejected: false };
  }
  const wanted = normalizeZone(clean(raw.provincia, 80));
  const province = CR_PROVINCES.find((name) => normalizeZone(name) === wanted) ?? null;
  if (!province) return { destination: null, countryRejected: false };
  return { destination: { country: STORE_COUNTRY, province, city: clean(raw.ciudad, 80), postalCode: clean(raw.cp, 20) }, countryRejected: false };
}
