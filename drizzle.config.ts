import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Drizzle Kit no lee los archivos de entorno de Next.js, así que los cargamos aquí.
config({ path: [".env.local", ".env"], quiet: true });

/**
 * CONEXIÓN DE MIGRACIONES (Drizzle Kit) — separada del runtime de la app.
 *
 * Drizzle Kit elige el driver de PostgreSQL SOLO según qué paquete encuentra
 * instalado, en este orden fijo: `pg` → `postgres` → `@vercel/postgres` →
 * `@neondatabase/serverless`. No se puede forzar desde esta configuración.
 *
 * La app usa `@neondatabase/serverless` (HTTP) en `src/db/index.ts`. Si ese fuera
 * el único driver instalado, Kit lo usaría también para migrar, por WebSocket,
 * y mostraría "can only connect to remote Neon… through a websocket".
 * Por eso `pg` está instalado como devDependency: solo lo usa Drizzle Kit
 * (conexión TCP directa, la recomendada para migraciones) y la app NO lo importa.
 * No lo desinstales.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    // Neon recomienda la conexión DIRECTA (sin pooling) para migraciones.
    // Si no definís DATABASE_URL_UNPOOLED, se usa DATABASE_URL.
    // (`generate` no necesita conexión; `migrate`, `push` y `studio` sí.)
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "",
  },
  strict: true,
  verbose: true,
});
