import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Drizzle Kit no lee los archivos de entorno de Next.js, así que los cargamos aquí.
config({ path: [".env.local", ".env"], quiet: true });

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
