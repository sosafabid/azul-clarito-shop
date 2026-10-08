import "server-only";
import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import type { Database } from "@/db/client";
import type { RateLimit } from "@/domain/auth-tokens";
import { optionalEnv } from "@/server/env";

/**
 * Límite de frecuencia respaldado por la base de datos (funciona igual en Vercel, donde
 * cada petición puede caer en una instancia distinta). Solo se cuentan los intentos
 * PERMITIDOS, así que una inundación no crece sin límite.
 *
 * La clave (correo o IP) se guarda como HMAC: no hay correos ni IPs en claro en `auth_throttle`.
 */
function keyHash(bucket: string, key: string): string {
  const secret = optionalEnv("AUTH_SECRET") ?? "azul-clarito-throttle";
  return createHmac("sha256", secret).update(`${bucket}:${key}`).digest("hex");
}

/** `true` si todavía se permite el intento (y lo registra); `false` si se superó el límite. */
export async function allowAttempt(db: Database, bucket: string, key: string, limit: RateLimit): Promise<boolean> {
  const hash = keyHash(bucket, key);
  const result = await db.execute(sql`
    insert into auth_throttle (bucket, key_hash)
    select ${bucket}::text, ${hash}::text
    where (
      select count(*) from auth_throttle
      where bucket = ${bucket}::text and key_hash = ${hash}::text
        and created_at > now() - make_interval(secs => ${limit.windowSeconds}::double precision)
    ) < ${limit.max}::bigint
    returning id
  `);
  // Limpieza ocasional de filas viejas (no depende de un cron).
  if (Math.random() < 0.02) {
    await db.execute(sql`delete from auth_throttle where created_at < now() - interval '2 days'`);
  }
  return result.rows.length > 0;
}

/** Dirección IP de quien hace la petición (Vercel la fija en `x-forwarded-for`). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || h.get("x-real-ip") || "unknown").slice(0, 64);
}
