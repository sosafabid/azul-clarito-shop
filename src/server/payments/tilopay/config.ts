import "server-only";
import { isSupportedCurrency, type CurrencyCode } from "@/domain/money";
import type { TilopayMode } from "@/domain/tilopay";
import { optionalEnv } from "@/server/env";

/**
 * CONFIGURACIÓN DE TILOPAY — SOLO SERVIDOR. Todas las variables son PRIVADAS (ninguna lleva NEXT_PUBLIC).
 *
 *   TILOPAY_API_USER / TILOPAY_API_PASSWORD   credenciales del API (Admin · Tilopay Checkout) → login del token
 *   TILOPAY_API_KEY                           la `key` de integración (Admin · Tilopay Checkout)
 *   TILOPAY_MERCHANT_ID                       (opcional) merchantId para `consult`; el ejemplo oficial lo envía vacío
 *   TILOPAY_MODE                              "sandbox" (por defecto) | "production"
 *   TILOPAY_CONFIRM_PRODUCTION                debe valer exactamente "SI_COBRAR_DE_VERDAD" para aceptar el modo production
 *   TILOPAY_CURRENCIES                        monedas habilitadas en la cuenta, p. ej. "CRC" (por defecto CRC)
 *   CRON_SECRET                               (opcional) protege la tarea de conciliación /api/cron/payments-reconcile
 *
 * Falla CERRADO: si falta algo, o el modo es desconocido, los pagos quedan deshabilitados (no se crea ningún pedido).
 * Nunca se pasa de sandbox a producción solo: hacen falta DOS variables explícitas.
 */
export const PRODUCTION_CONFIRMATION = "SI_COBRAR_DE_VERDAD";

export type TilopayConfig = {
  mode: TilopayMode;
  apiUser: string;
  apiPassword: string;
  key: string;
  merchantId: string;
  currencies: readonly CurrencyCode[];
};

export type TilopayConfigState =
  | { ok: true; config: TilopayConfig }
  | { ok: false; reason: "not_configured" | "invalid_mode" | "production_not_confirmed"; missing: string[] };

const REQUIRED = ["TILOPAY_API_USER", "TILOPAY_API_PASSWORD", "TILOPAY_API_KEY"] as const;

export function readTilopayConfig(): TilopayConfigState {
  const missing = REQUIRED.filter((name) => !optionalEnv(name));
  if (missing.length > 0) return { ok: false, reason: "not_configured", missing: [...missing] };

  const modeRaw = (optionalEnv("TILOPAY_MODE") ?? "sandbox").trim().toLowerCase();
  if (modeRaw !== "sandbox" && modeRaw !== "production") return { ok: false, reason: "invalid_mode", missing: [] };
  if (modeRaw === "production" && optionalEnv("TILOPAY_CONFIRM_PRODUCTION") !== PRODUCTION_CONFIRMATION) {
    return { ok: false, reason: "production_not_confirmed", missing: [] };
  }
  const currencies = (optionalEnv("TILOPAY_CURRENCIES") ?? "CRC")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(isSupportedCurrency);
  return {
    ok: true,
    config: {
      mode: modeRaw,
      apiUser: optionalEnv("TILOPAY_API_USER") as string,
      apiPassword: optionalEnv("TILOPAY_API_PASSWORD") as string,
      key: optionalEnv("TILOPAY_API_KEY") as string,
      merchantId: optionalEnv("TILOPAY_MERCHANT_ID") ?? "",
      currencies: currencies.length > 0 ? currencies : ["CRC"],
    },
  };
}

/** ¿Se puede cobrar? (sin exponer ningún valor). */
export function isPaymentsEnabled(): boolean {
  return readTilopayConfig().ok;
}
