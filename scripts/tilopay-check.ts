/**
 * Revisión de la configuración de Tilopay SIN imprimir secretos.
 *
 *   npm run tilopay:check            → solo revisa las variables (no hace ninguna llamada a la red)
 *   npm run tilopay:check -- --login → además hace UN inicio de sesión en la API de Tilopay (no crea pagos ni consulta pedidos)
 *
 * Imprime únicamente: qué variables están definidas (sí/no), el modo, y el resultado del login (ok/error). Nunca valores.
 */
import { config as loadEnv } from "dotenv";
import { checkCredentials, TilopayError } from "@/server/payments/tilopay/client";
import { readTilopayConfig } from "@/server/payments/tilopay/config";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const NAMES = ["TILOPAY_API_USER", "TILOPAY_API_PASSWORD", "TILOPAY_API_KEY", "TILOPAY_MERCHANT_ID", "TILOPAY_MODE", "TILOPAY_CONFIRM_PRODUCTION", "TILOPAY_CURRENCIES", "CRON_SECRET", "NEXT_PUBLIC_SITE_URL", "DATABASE_URL"] as const;

async function main() {
  console.log("Variables (solo si están definidas, nunca su valor):");
  for (const name of NAMES) console.log(`  ${name.padEnd(28)} ${process.env[name] ? "definida" : "NO definida"}`);

  const state = readTilopayConfig();
  if (!state.ok) {
    console.log(`\nConfiguración: NO lista (${state.reason}${state.missing.length ? `; faltan: ${state.missing.join(", ")}` : ""}). El checkout no cobra.`);
    process.exit(1);
  }
  const explicit = Boolean(process.env.TILOPAY_MODE?.trim());
  console.log(`\nConfiguración: lista. Monedas: ${state.config.currencies.join(", ")}.`);
  console.log(
    explicit
      ? `Modo de la tienda: ${state.config.mode} (definido en TILOPAY_MODE; es configuración de la aplicación y no verifica el modo de Tilopay).`
      : `Modo de la tienda: ${state.config.mode} (configuración interna de la aplicación; no verifica el modo de Tilopay).`,
  );
  if (state.config.mode !== "sandbox") console.log("⚠ El modo de la tienda NO es sandbox.");

  if (!process.argv.includes("--login")) {
    console.log("Sin llamadas a la red (agregá --login para probar el inicio de sesión).");
    return;
  }
  try {
    const result = await checkCredentials(state.config);
    console.log(`Inicio de sesión en Tilopay: OK (token con vigencia de ~${result.expiresInSeconds ?? "?"} s).`);
  } catch (error) {
    console.log(`Inicio de sesión en Tilopay: FALLÓ (${error instanceof TilopayError ? error.kind : "error"}).`);
    process.exit(1);
  }
}
main().catch(() => {
  console.error("Falló la revisión.");
  process.exit(1);
});
