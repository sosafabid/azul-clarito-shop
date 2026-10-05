/**
 * Prueba mínima de conexión a la base de datos (lectura real, sin escribir nada).
 *
 *   npm run db:ping
 *
 * Hace `SELECT count(*) FROM products` con el MISMO cliente que usa la app y
 * muestra solo información segura: nunca imprime la cadena de conexión, el host
 * ni credenciales. Es un script de terminal: no existe como ruta web.
 */
import { config } from "dotenv";
import { count } from "drizzle-orm";
import { createDatabase } from "@/db/client";
import { products } from "@/db/schema";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Falta la variable DATABASE_URL (definila en .env.local).");
    process.exit(1);
  }

  const db = createDatabase(url);
  const [row] = await db.select({ total: count() }).from(products);

  console.log(
    JSON.stringify(
      { database: "connected", status: "ok", check: "select count(*) from products", products: row.total },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  // Solo el código de error: el mensaje completo podría incluir datos de la conexión.
  const code = (error as { code?: string }).code ?? null;
  console.error(JSON.stringify({ database: "error", status: "failed", errorCode: code }));
  process.exit(1);
});
