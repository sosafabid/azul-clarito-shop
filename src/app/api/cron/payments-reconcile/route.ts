import { timingSafeEqual } from "node:crypto";
import { getDb, isDatabaseConfigured } from "@/db";
import { optionalEnv } from "@/server/env";
import { reconcilePayments } from "@/server/services/payments/reconcile";

/**
 * TAREA PROGRAMADA de conciliación (Vercel Cron la llama con `Authorization: Bearer <CRON_SECRET>`).
 * Verifica con Tilopay los pagos pendientes, libera las reservas vencidas y reintenta los correos fallidos.
 * Sin `CRON_SECRET` configurado NO hace nada (falla cerrado). No recibe datos del llamador.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = optionalEnv("CRON_SECRET");
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request): Promise<Response> {
  if (!optionalEnv("CRON_SECRET")) return Response.json({ ok: false, error: "cron_not_configured" }, { status: 503 });
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401 });
  if (!isDatabaseConfigured()) return Response.json({ ok: false, error: "no_database" }, { status: 503 });
  const summary = await reconcilePayments(getDb(), { limit: 30, source: "reconcile" });
  return Response.json({ ok: true, ...summary });
}
