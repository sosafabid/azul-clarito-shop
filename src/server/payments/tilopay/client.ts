import "server-only";
import { TILOPAY_API_HOST, parseConsultResponse, parseProcessPaymentResponse, type ConsultItem } from "@/domain/tilopay";
import type { TilopayConfig } from "./config";

/**
 * CLIENTE HTTP de Tilopay (servidor a servidor). Solo habla con `https://app.tilopay.com`.
 *
 * Seguridad:
 *  - El token (JWT, 24 h) y las credenciales viven SOLO en memoria del servidor; no se registran ni se devuelven.
 *  - Los errores que salen de aquí son `TilopayError` con un tipo y un mensaje SEGUROS: jamás incluyen el cuerpo de la
 *    petición (llevaría la `key` y datos de la clienta) ni el de la respuesta.
 *  - La API informa el resultado en el CUERPO, no en el estado HTTP; por eso el cuerpo siempre se valida.
 *
 * No hay reintentos automáticos de `processPayment`: la API NO es idempotente (ver "Reintentos seguros" en la docs).
 */
export type TilopayErrorKind = "network" | "auth" | "invalid_response" | "rejected";

export class TilopayError extends Error {
  constructor(readonly kind: TilopayErrorKind, message: string) {
    super(message);
    this.name = "TilopayError";
  }
}

const TIMEOUT_MS = 15_000;
let cachedToken: { value: string; expiresAt: number; fingerprint: string } | null = null;

async function post(path: string, body: unknown, token?: string): Promise<{ status: number; json: unknown }> {
  try {
    const response = await fetch(`${TILOPAY_API_HOST}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    let json: unknown = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }
    return { status: response.status, json };
  } catch (error) {
    throw new TilopayError("network", `No se pudo contactar a Tilopay (${error instanceof Error ? error.name : "error"}).`);
  }
}

async function getToken(config: TilopayConfig, forceRefresh = false): Promise<string> {
  const fingerprint = `${config.apiUser.length}:${config.apiPassword.length}`;
  if (!forceRefresh && cachedToken && cachedToken.fingerprint === fingerprint && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const { json } = await post("/api/v1/login", { apiuser: config.apiUser, password: config.apiPassword });
  const token = typeof json === "object" && json !== null ? (json as { access_token?: unknown }).access_token : undefined;
  const expiresIn = typeof json === "object" && json !== null ? Number((json as { expires_in?: unknown }).expires_in) : NaN;
  if (typeof token !== "string" || token.length < 10) throw new TilopayError("auth", "Tilopay no entregó un token: revisá TILOPAY_API_USER y TILOPAY_API_PASSWORD.");
  cachedToken = { value: token, expiresAt: Date.now() + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600) * 1000, fingerprint };
  return token;
}

/** Llama a un endpoint autenticado; si el token fue rechazado (401) lo renueva UNA vez. */
async function authed(config: TilopayConfig, path: string, body: unknown): Promise<unknown> {
  let token = await getToken(config);
  let result = await post(path, body, token);
  if (result.status === 401) {
    cachedToken = null;
    token = await getToken(config, true);
    result = await post(path, body, token);
    if (result.status === 401) throw new TilopayError("auth", "Tilopay rechazó el token (401).");
  }
  return result.json;
}

/** Comprueba SOLO el inicio de sesión (`/api/v1/login`): no crea pagos ni consulta pedidos. Devuelve únicamente la vigencia del token, nunca el token. */
export async function checkCredentials(config: TilopayConfig): Promise<{ expiresInSeconds: number | null }> {
  cachedToken = null;
  await getToken(config, true);
  const seconds = cachedToken ? Math.round((((cachedToken as { expiresAt: number }).expiresAt) - Date.now()) / 1000) : null;
  cachedToken = null;
  return { expiresInSeconds: seconds };
}

export function resetTilopayTokenCache(): void {
  cachedToken = null;
}

/** Pide la página de pago (HPP). Devuelve la URL a la que se redirige a la clienta. */
export async function createPaymentSession(config: TilopayConfig, body: Record<string, string>): Promise<{ url: string }> {
  const json = await authed(config, "/api/v1/processPayment", body);
  const parsed = parseProcessPaymentResponse(json);
  if (!parsed.ok) {
    // Si el cuerpo trae un mensaje, solo se conserva un texto corto y sin la petición.
    const type = typeof json === "object" && json !== null ? String((json as { type?: unknown }).type ?? "").slice(0, 20) : "";
    throw new TilopayError(parsed.reason === "invalid_response" ? "invalid_response" : "rejected", `Tilopay no devolvió una página de pago${type ? ` (type ${type})` : ""}.`);
  }
  return { url: parsed.url };
}

/** Consulta, servidor a servidor, el estado REAL de las transacciones de un `orderNumber`. */
export async function consultOrder(config: TilopayConfig, providerOrderNumber: string): Promise<ConsultItem[]> {
  const json = await authed(config, "/api/v1/consult", { key: config.key, orderNumber: providerOrderNumber, merchantId: config.merchantId });
  const parsed = parseConsultResponse(json);
  if (!parsed.ok) throw new TilopayError("invalid_response", "Tilopay respondió a la consulta con un formato inesperado.");
  return parsed.items;
}
