/**
 * Conciliación manual de pagos:  npm run payments:reconcile
 * Verifica con Tilopay los pagos pendientes, libera reservas vencidas y reintenta correos fallidos.
 * Usa las mismas variables que la tienda (DATABASE_URL, TILOPAY_*, RESEND_*). No imprime ningún secreto.
 */
import { config } from "dotenv";
import { createDatabase } from "@/db/client";
import { reconcilePayments } from "@/server/services/payments/reconcile";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL.");
  const summary = await reconcilePayments(createDatabase(url), { limit: 50, source: "reconcile" });
  console.log("Conciliación terminada:", JSON.stringify(summary));
}
main().catch((error) => {
  console.error("Falló la conciliación:", error instanceof Error ? error.message : "error");
  process.exit(1);
});
