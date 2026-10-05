import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Fábrica ÚNICA del cliente de base de datos (Neon + Drizzle, driver HTTP).
 *
 * La usan la app (`./index.ts`) y los scripts (`scripts/*.ts`), así que existe
 * una sola forma de conectarse. No lee variables de entorno ni es "server-only"
 * a propósito (para poder usarla desde scripts): en la app se usa `getDb()`.
 *
 * Nunca recibe ni escribe la cadena de conexión en logs: contiene credenciales.
 */
export function createDatabase(connectionString: string) {
  return drizzle(neon(connectionString), { schema });
}

export type Database = ReturnType<typeof createDatabase>;
