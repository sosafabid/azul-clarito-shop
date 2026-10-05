import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { requireEnv } from "@/server/env";
import * as schema from "./schema";

/**
 * Cliente de base de datos (Neon + Drizzle).
 *
 * - Es PEREZOSO: no se conecta al importar este archivo, sino la primera vez
 *   que se llama a `getDb()`. Así `next build` funciona sin `DATABASE_URL`.
 * - Solo puede importarse desde código de servidor (`server-only`).
 *
 * LIMITACIÓN A TENER EN CUENTA: el driver `neon-http` NO soporta
 * `db.transaction()` interactivas. Para operaciones atómicas hay dos caminos:
 *   1) una sola sentencia SQL condicionada (p. ej. reservar stock con
 *      `UPDATE ... WHERE available_stock >= n`), o
 *   2) `db.batch([...])`, que ejecuta varias sentencias de forma atómica.
 * Si más adelante hace falta una transacción interactiva, se añade un segundo
 * cliente con `drizzle-orm/neon-serverless` (WebSocket).
 */
let cached: ReturnType<typeof createDb> | undefined;

function createDb() {
  const sql = neon(requireEnv("DATABASE_URL"));
  return drizzle(sql, { schema });
}

export function getDb() {
  cached ??= createDb();
  return cached;
}

export type Database = ReturnType<typeof getDb>;
export { schema };
