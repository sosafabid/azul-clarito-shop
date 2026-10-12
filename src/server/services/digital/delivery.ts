import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import {
  DOWNLOAD_LINK_RULES,
  DOWNLOAD_TOKEN_PATTERN,
  MAX_PAGE_LINKS_PER_ITEM_PER_DAY,
  PAID_ORDER_STATUSES,
  safeDownloadName,
  type DownloadPurpose,
} from "@/domain/fulfillment";
import { isUuid } from "@/domain/ids";

/**
 * ENTREGA DE LIBROS DIGITALES — enlaces temporales y descarga protegida.
 *
 * Reglas (todas se evalúan en la BASE DE DATOS, dentro de la misma sentencia que entrega o crea el enlace):
 *  - Un enlace solo se crea, y una descarga solo se autoriza, si el pedido está PAGADO: estado de pedido de "pagado" en adelante Y un pago
 *    aprobado y verificado con Tilopay. Volver a la página de éxito no habilita nada; un pedido pendiente, rechazado, cancelado o
 *    reembolsado no descarga (aunque tenga un enlace viejo: el estado se vuelve a comprobar en CADA descarga).
 *  - El token tiene 32 bytes aleatorios (base64url); en la base solo se guarda su HASH.
 *  - Cada enlace vence y tiene un tope de descargas. El contador sube de forma atómica (`update … where count < max`).
 *  - No hay URL permanente: el archivo vive en un almacén privado y solo el servidor lo lee.
 */
export const hashDownloadToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newDownloadToken = () => randomBytes(32).toString("base64url");
export const isDownloadToken = (value: string) => DOWNLOAD_TOKEN_PATTERN.test(value);

const PAID_LIST = sql.raw(PAID_ORDER_STATUSES.map((s) => `'${s}'`).join(", "));

/** Condición SQL de "este pedido está pagado de verdad" (estado del pedido + un pago aprobado). `o` = alias de orders. */
const orderIsPaid = sql`o.status::text in (${PAID_LIST}) and exists (select 1 from payments p where p.order_id = o.id and p.status = 'PAID')`;

export type DigitalItem = { orderItemId: string; name: string; productId: string | null };

/** Libros digitales de un pedido (copia histórica del nombre al comprar). */
export async function listDigitalItems(db: Database, orderId: string): Promise<DigitalItem[]> {
  const result = await db.execute(sql`
    select id, name_snapshot as name, product_id from order_items
     where order_id = ${orderId}::uuid and fulfillment_type = 'DIGITAL' order by created_at asc, id asc
  `);
  return (result.rows as { id: string; name: string; product_id: string | null }[]).map((r) => ({ orderItemId: r.id, name: r.name, productId: r.product_id }));
}

export async function orderHasDigital(db: Database, orderId: string): Promise<boolean> {
  return (await listDigitalItems(db, orderId)).length > 0;
}

export async function isOrderPaid(db: Database, orderId: string): Promise<boolean> {
  const result = await db.execute(sql`select 1 as ok from orders o where o.id = ${orderId}::uuid and ${orderIsPaid} limit 1`);
  return result.rows.length > 0;
}

/**
 * Crea un enlace temporal para UN libro de un pedido pagado. Devuelve el token (la única vez que existe en claro) o `null` si el
 * pedido no está pagado / el libro no es del pedido.
 */
export async function mintDownloadLink(db: Database, input: { orderId: string; orderItemId: string; purpose: DownloadPurpose }): Promise<string | null> {
  if (!isUuid(input.orderId) || !isUuid(input.orderItemId)) return null;
  const rule = DOWNLOAD_LINK_RULES[input.purpose];
  const token = newDownloadToken();
  const result = await db.execute(sql`
    insert into digital_download_links (order_id, order_item_id, token_hash, purpose, expires_at, max_downloads)
    select o.id, oi.id, ${hashDownloadToken(token)}::text, ${input.purpose}::text, now() + make_interval(mins => ${rule.ttlMinutes}::int), ${rule.maxDownloads}::int
      from orders o join order_items oi on oi.order_id = o.id
     where o.id = ${input.orderId}::uuid and oi.id = ${input.orderItemId}::uuid and oi.fulfillment_type = 'DIGITAL' and ${orderIsPaid}
    returning id
  `);
  return result.rows.length > 0 ? token : null;
}

export type PreparedDownload = { name: string; token: string };

/** Enlaces nuevos para TODOS los libros digitales de un pedido pagado (correo de entrega / recuperación). */
export async function prepareEmailDownloads(db: Database, orderId: string, purpose: Extract<DownloadPurpose, "EMAIL" | "RECOVERY">): Promise<PreparedDownload[]> {
  const out: PreparedDownload[] = [];
  for (const item of await listDigitalItems(db, orderId)) {
    const token = await mintDownloadLink(db, { orderId, orderItemId: item.orderItemId, purpose });
    if (token) out.push({ name: item.name, token });
  }
  return out;
}

export type ClaimedDownload = { linkId: string; orderId: string; orderItemId: string; storageKey: string; fileName: string; sizeBytes: number; productName: string };

/**
 * Autoriza UNA descarga con un enlace de correo/recuperación: en una sola sentencia comprueba hash, vigencia, revocación, tope de
 * descargas, que el pedido siga PAGADO y que el producto tenga archivo activo, y SUMA 1 al contador. `null` = no autorizada.
 */
export async function claimDownloadByToken(db: Database, token: string): Promise<ClaimedDownload | null> {
  if (!isDownloadToken(token)) return null;
  const result = await db.execute(sql`
    with claimed as (
      update digital_download_links l
         set download_count = l.download_count + 1, last_downloaded_at = now()
        from orders o, order_items oi
       where l.token_hash = ${hashDownloadToken(token)}::text
         and l.revoked_at is null and l.expires_at > now() and l.download_count < l.max_downloads
         and o.id = l.order_id and oi.id = l.order_item_id and oi.fulfillment_type = 'DIGITAL'
         and ${orderIsPaid}
         and exists (select 1 from digital_assets da where da.product_id = oi.product_id and da.is_active)
      returning l.id, l.order_id, l.order_item_id, oi.product_id, oi.name_snapshot
    )
    select c.id as link_id, c.order_id, c.order_item_id, c.name_snapshot as product_name, da.storage_key, da.file_name, da.size_bytes
      from claimed c join digital_assets da on da.product_id = c.product_id and da.is_active
  `);
  return toClaim(result.rows[0]);
}

/**
 * Descarga desde la PÁGINA del pedido (el acceso lo da el enlace privado del pedido, ya validado por quien llama). Registra la descarga
 * como un enlace de un solo uso ya consumido (así hay auditoría y un tope diario por libro) y devuelve el archivo a entregar.
 */
export async function claimDownloadForOrderPage(db: Database, input: { orderId: string; orderItemId: string }): Promise<ClaimedDownload | null> {
  if (!isUuid(input.orderId) || !isUuid(input.orderItemId)) return null;
  const result = await db.execute(sql`
    with ins as (
      insert into digital_download_links (order_id, order_item_id, token_hash, purpose, expires_at, max_downloads, download_count, last_downloaded_at)
      select o.id, oi.id, ${hashDownloadToken(newDownloadToken())}::text, 'PAGE', now() + interval '1 minute', 1, 1, now()
        from orders o join order_items oi on oi.order_id = o.id
       where o.id = ${input.orderId}::uuid and oi.id = ${input.orderItemId}::uuid and oi.fulfillment_type = 'DIGITAL' and ${orderIsPaid}
         and exists (select 1 from digital_assets da where da.product_id = oi.product_id and da.is_active)
         and (select count(*) from digital_download_links x where x.order_item_id = oi.id and x.purpose = 'PAGE' and x.created_at > now() - interval '1 day') < ${MAX_PAGE_LINKS_PER_ITEM_PER_DAY}::int
      returning id, order_id, order_item_id
    )
    select ins.id as link_id, ins.order_id, ins.order_item_id, oi.name_snapshot as product_name, da.storage_key, da.file_name, da.size_bytes
      from ins join order_items oi on oi.id = ins.order_item_id join digital_assets da on da.product_id = oi.product_id and da.is_active
  `);
  return toClaim(result.rows[0]);
}

/** Si el archivo no se pudo leer del almacén, la descarga no se cuenta (la clienta no perdió un intento). */
export async function refundDownload(db: Database, linkId: string): Promise<void> {
  await db.execute(sql`update digital_download_links set download_count = greatest(download_count - 1, 0) where id = ${linkId}::uuid`);
}

function toClaim(row: unknown): ClaimedDownload | null {
  if (!row) return null;
  const r = row as { link_id: string; order_id: string; order_item_id: string; storage_key: string; file_name: string; size_bytes: string | number; product_name: string };
  return { linkId: r.link_id, orderId: r.order_id, orderItemId: r.order_item_id, storageKey: r.storage_key, fileName: safeDownloadName(r.product_name || r.file_name), sizeBytes: Number(r.size_bytes), productName: r.product_name };
}

/** Estado de los libros de un pedido para mostrarlos en su página. */
export async function digitalItemsForPage(db: Database, orderId: string): Promise<{ orderItemId: string; name: string; available: boolean }[]> {
  const result = await db.execute(sql`
    select oi.id, oi.name_snapshot as name,
           exists (select 1 from digital_assets da where da.product_id = oi.product_id and da.is_active) as available
      from order_items oi where oi.order_id = ${orderId}::uuid and oi.fulfillment_type = 'DIGITAL' order by oi.created_at asc, oi.id asc
  `);
  return (result.rows as { id: string; name: string; available: boolean }[]).map((r) => ({ orderItemId: r.id, name: r.name, available: r.available }));
}

/** Pedido pagado con libros digitales, por número de pedido + correo (para "Recuperar mi compra"). */
export async function findRecoverableOrder(db: Database, input: { orderNumber: string; email: string }): Promise<string | null> {
  const result = await db.execute(sql`
    select o.id from orders o
     where o.order_number = ${input.orderNumber}::text and lower(o.email) = ${input.email.toLowerCase()}::text and ${orderIsPaid}
       and exists (select 1 from order_items oi where oi.order_id = o.id and oi.fulfillment_type = 'DIGITAL')
     limit 1
  `);
  return (result.rows[0] as { id?: string } | undefined)?.id ?? null;
}
