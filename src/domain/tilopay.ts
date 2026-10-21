import { fromMinorUnits, type CurrencyCode } from "./money";

/**
 * TILOPAY — reglas PURAS (sin red, sin base de datos, sin secretos).
 *
 * Fuente: documentación oficial (https://tilopay.com/developers). Aquí solo hay lo que está PUBLICADO:
 *   · POST /api/v1/login            → { access_token, token_type, expires_in }
 *   · POST /api/v1/processPayment   → { type, html, url }       (Hosted Payment Page)
 *   · POST /api/v1/consult          → { type, message, response: [ ...transacciones ] }
 *   · Retorno del navegador: GET al `redirect` con code (1 = aprobado), description, auth, order, tilopay-transaction, OrderHash, returnData…
 *
 * NO está publicado (y por eso NO se inventa): el algoritmo de `OrderHash`, el esquema y la autenticación del webhook,
 * los valores posibles de `code`/`type`, los límites de `orderNumber`, el formato exacto de "no encontrado".
 * Ver README → "Pagos con Tilopay" para la lista de preguntas a soporte.
 */

/** Todas las operaciones usan este único host; el modo prueba/producción lo decide la cuenta en el portal de Tilopay. */
export const TILOPAY_API_HOST = "https://app.tilopay.com";

/** Una reserva de stock dura esto; pasado el plazo, el pedido pendiente se verifica una última vez y, si no se pagó, se cancela. */
export const RESERVATION_MINUTES = 30;

export type TilopayMode = "sandbox" | "production";

/** Códigos ISO 3166-2 de las provincias (el formato `CR-SJ` que pide el campo `billToState`). */
export const CR_STATE_CODES: Record<string, string> = {
  "san jose": "CR-SJ",
  alajuela: "CR-A",
  cartago: "CR-C",
  heredia: "CR-H",
  guanacaste: "CR-G",
  puntarenas: "CR-P",
  limon: "CR-L",
};

export function crStateCode(province: string): string | null {
  const key = province.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
  return CR_STATE_CODES[key] ?? null;
}

/** `orderNumber` que se envía al proveedor. Único para siempre: el intento 1 usa el número del pedido; los demás, un sufijo. */
export function providerOrderNumber(orderNumber: string, attempt: number): string {
  if (!Number.isInteger(attempt) || attempt < 1) throw new RangeError("El intento debe ser un entero positivo.");
  return attempt === 1 ? orderNumber : `${orderNumber}-${attempt}`;
}

/** Monto como texto con 2 decimales ("12000.00"), el formato de los ejemplos oficiales. Viene del TOTAL guardado del pedido. */
export function formatProviderAmount(amountMinor: number, currency: CurrencyCode): string {
  return fromMinorUnits(amountMinor, currency).toFixed(2);
}

export type PaymentSessionInput = {
  key: string;
  redirectUrl: string;
  returnData: string;
  orderNumber: string;
  amountMinor: number;
  currency: CurrencyCode;
  customer: { firstName: string; lastName: string; email: string; phone: string };
  address: { line1: string; line2: string; city: string; stateCode: string; postalCode: string; countryCode: string };
};

/**
 * Cuerpo de `processPayment`. Solo los campos REQUERIDOS por la documentación, más `returnData` (el eco que Tilopay devuelve
 * en el retorno; lo usamos como identificador opaco del intento). No se envían `hashVersion` ni `token_version`: son opcionales y no
 * se verificó su efecto. La dirección de facturación y la de envío son la misma (no hay formulario separado).
 */
export function buildProcessPaymentBody(input: PaymentSessionInput): Record<string, string> {
  const { customer, address } = input;
  const person = {
    FirstName: customer.firstName,
    LastName: customer.lastName,
    Address: address.line1,
    Address2: address.line2,
    City: address.city,
    State: address.stateCode,
    ZipPostCode: address.postalCode,
    Country: address.countryCode,
    Telephone: customer.phone,
  };
  const body: Record<string, string> = {
    redirect: input.redirectUrl,
    key: input.key,
    amount: formatProviderAmount(input.amountMinor, input.currency),
    currency: input.currency,
    orderNumber: input.orderNumber,
    capture: "1",
    billToEmail: customer.email,
    subscription: "0",
    platform: "api",
    returnData: input.returnData,
  };
  for (const [name, value] of Object.entries(person)) {
    body[`billTo${name}`] = value;
    body[`shipTo${name}`] = value;
  }
  return body;
}

/** La URL de pago que devuelve el proveedor solo se acepta si es https y pertenece a tilopay.com (evita redirigir a otro sitio). */
export function isTilopayPaymentUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "tilopay.com" || url.hostname.endsWith(".tilopay.com")) && url.username === "" && url.password === "";
  } catch {
    return false;
  }
}

export type ParsedSession = { ok: true; url: string } | { ok: false; reason: "invalid_response" | "no_url" };

export function parseProcessPaymentResponse(json: unknown): ParsedSession {
  if (typeof json !== "object" || json === null) return { ok: false, reason: "invalid_response" };
  const url = (json as { url?: unknown }).url;
  return isTilopayPaymentUrl(url) ? { ok: true, url } : { ok: false, reason: "no_url" };
}

// ── Verificación (consult) ────────────────────────────────────────────────────

export type ConsultItem = {
  providerId: string | null;
  orderNumber: string;
  amount: string;
  currency: string;
  code: string;
  message: string;
  environment: string;
  kind: string;
  date: string;
};

export type ParsedConsult = { ok: true; items: ConsultItem[] } | { ok: false; reason: "invalid_response" };

const text = (value: unknown): string => (typeof value === "string" ? value : typeof value === "number" ? String(value) : "");

/** Lee la respuesta de `consult` sin confiar en su forma: lo que no tenga el formato esperado se descarta. */
export function parseConsultResponse(json: unknown): ParsedConsult {
  if (typeof json !== "object" || json === null) return { ok: false, reason: "invalid_response" };
  const response = (json as { response?: unknown }).response;
  if (!Array.isArray(response)) return { ok: false, reason: "invalid_response" };
  const items: ConsultItem[] = [];
  for (const raw of response) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const orderNumber = text(r.orderNumber);
    const code = text(r.code);
    if (orderNumber === "" || code === "") continue;
    items.push({
      providerId: text(r.id_tilopay) || null,
      orderNumber,
      amount: text(r.amount),
      currency: text(r.currency).toUpperCase(),
      code,
      message: text(r.response).slice(0, 200),
      environment: text(r.environment),
      kind: text(r.type),
      date: text(r.date),
    });
  }
  return { ok: true, items };
}

export type ExpectedPayment = { orderNumber: string; amountMinor: number; currency: CurrencyCode };

export type MismatchReason = "amount" | "currency" | "environment";

export type PaymentVerdict =
  | { kind: "approved"; providerId: string | null; message: string; environment: string }
  | { kind: "rejected"; providerId: string | null; code: string; message: string; environment: string }
  | { kind: "not_found" }
  | { kind: "mismatch"; reasons: MismatchReason[]; providerId: string | null; code: string; environment: string };

/** "12000.00" → centésimas (1200000). `null` si no es un monto decimal simple. */
export function amountToCents(value: string): number | null {
  if (!/^\d{1,12}(\.\d{1,4})?$/.test(value.trim())) return null;
  return Math.round(Number(value) * 100);
}

/**
 * Decide qué significa la respuesta VERIFICADA del proveedor para UN intento. Es la ÚNICA fuente de verdad del pago:
 * el navegador (query del retorno) nunca llega aquí.
 *
 *  - sin transacciones              → not_found      (no se asume que falló: puede no haberse pagado todavía)
 *  - ninguna con code "1"           → rejected       (la documentación: code=1 aprobado; cualquier otro = rechazado)
 *  - code "1" pero monto, moneda o ambiente no coinciden → mismatch (NO se confirma; queda para revisión humana)
 *  - code "1" y todo coincide       → approved
 *
 * Ambiente: en modo `sandbox` solo se acepta una transacción de ambiente "Test" (así un cobro REAL nunca se da por bueno
 * por accidente); en modo `production`, una de ambiente "Test" tampoco se acepta.
 */
/**
 * ¿Esta transacción de Tilopay corresponde a nuestro `orderNumber`? En el portal real Tilopay muestra (y devuelve) el número con
 * un prefijo propio del comercio, p. ej. `PFC031168-AC-2026-000007` para el que enviamos como `AC-2026-000007`. Se acepta el
 * número exacto, o el mismo número precedido por UN prefijo de letras+dígitos y un guion. Nada más: `…-000007-2` (otro intento)
 * no coincide con `AC-2026-000007`, ni un número que solo "termine parecido".
 */
export function matchesProviderOrder(received: string, expected: string): boolean {
  if (received === expected) return true;
  const suffix = `-${expected}`;
  if (!received.endsWith(suffix)) return false;
  return /^[A-Za-z]{2,5}\d{3,10}$/.test(received.slice(0, received.length - suffix.length));
}

export function evaluateConsult(items: readonly ConsultItem[], expected: ExpectedPayment, mode: TilopayMode): PaymentVerdict {
  const mine = items.filter((item) => matchesProviderOrder(item.orderNumber, expected.orderNumber));
  if (mine.length === 0) return { kind: "not_found" };

  const approved = mine.find((item) => item.code === "1");
  if (!approved) {
    const last = mine[mine.length - 1];
    return { kind: "rejected", providerId: last.providerId, code: last.code.slice(0, 40), message: last.message, environment: last.environment };
  }

  const reasons: MismatchReason[] = [];
  const cents = amountToCents(approved.amount);
  if (cents === null || cents !== Math.round(fromMinorUnits(expected.amountMinor, expected.currency) * 100)) reasons.push("amount");
  if (approved.currency !== expected.currency) reasons.push("currency");
  const isTest = approved.environment.trim().toLowerCase() === "test";
  if (mode === "sandbox" ? !isTest : isTest) reasons.push("environment");
  if (reasons.length > 0) return { kind: "mismatch", reasons, providerId: approved.providerId, code: approved.code, environment: approved.environment };
  return { kind: "approved", providerId: approved.providerId, message: approved.message, environment: approved.environment };
}
