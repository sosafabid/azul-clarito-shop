import "server-only";
import { requireEnv } from "@/server/env";
import { createDatabase, type Database } from "./client";
import * as schema from "./schema";

/**
 * Acceso a la base de datos de la aplicación (PostgreSQL en Neon + Drizzle).
 *
 * - Usa `DATABASE_URL` (la conexión con pooling de Neon). `DATABASE_URL_UNPOOLED`
 *   es SOLO para migraciones (Drizzle Kit, ver `drizzle.config.ts`).
 * - Driver `@neondatabase/serverless` por HTTP: recomendado por Neon para
 *   Vercel/Next.js. Cada consulta es una petición HTTP; no mantiene conexiones
 *   abiertas, así que el hot reload de desarrollo no puede "filtrar" conexiones.
 *   Aun así se guarda la instancia en `globalThis` para crearla una sola vez.
 * - Es PEREZOSO: no se conecta al importar, así `next build` funciona sin
 *   `DATABASE_URL`. Solo se puede importar desde código de servidor.
 * - Este driver NO soporta `db.transaction()` interactivas. Para operaciones
 *   atómicas se usa `db.batch([...])` (varias sentencias en una transacción) o
 *   una sola sentencia SQL condicionada.
 */
const globalForDb = globalThis as unknown as { __azulClaritoDb?: Database };

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb(): Database {
  globalForDb.__azulClaritoDb ??= createDatabase(requireEnv("DATABASE_URL"));
  return globalForDb.__azulClaritoDb;
}

export type { Database } from "./client";
export { schema };
