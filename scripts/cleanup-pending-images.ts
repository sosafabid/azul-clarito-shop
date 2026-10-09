/**
 * Limpia imágenes que se subieron al crear un producto pero nunca se guardaron (la persona cerró la página).
 *
 *   npm run images:cleanup              → solo MUESTRA lo que borraría (no borra nada)
 *   npm run images:cleanup -- --apply   → lo borra
 *
 * Solo toca archivos de la carpeta `products/pending/` con más de 24 horas, que ninguna fila de
 * `product_images` ni de `order_items` usa. Necesita DATABASE_URL y BLOB_READ_WRITE_TOKEN (.env.local).
 * Nunca imprime el token.
 */
import { del, list } from "@vercel/blob";
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { createDatabase } from "@/db/client";

config({ path: [".env.local", ".env"], quiet: true });

const MIN_AGE_MS = 24 * 60 * 60 * 1000;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL.");
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Falta BLOB_READ_WRITE_TOKEN.");
  const apply = process.argv.includes("--apply");
  const db = createDatabase(url);

  let cursor: string | undefined;
  let seen = 0;
  const candidates: { url: string; pathname: string }[] = [];
  do {
    const page = await list({ prefix: "products/pending/", cursor, limit: 500 });
    for (const blob of page.blobs) {
      seen += 1;
      if (Date.now() - new Date(blob.uploadedAt).getTime() < MIN_AGE_MS) continue;
      const result = await db.execute(sql`
        select (
          exists (select 1 from product_images where url = ${blob.url}::text)
          or exists (select 1 from order_items where image_url_snapshot = ${blob.url}::text)
        ) as used
      `);
      if ((result.rows[0] as { used?: boolean } | undefined)?.used) continue;
      candidates.push({ url: blob.url, pathname: blob.pathname });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  console.log(JSON.stringify({ revisados: seen, sobrantes: candidates.length, modo: apply ? "borrar" : "simulación" }));
  for (const item of candidates) console.log(`${apply ? "borrando" : "borraría"}  ${item.pathname}`);
  if (apply && candidates.length > 0) await del(candidates.map((item) => item.url));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Error desconocido.");
  process.exit(1);
});
