import { bigint, boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { DOWNLOAD_PURPOSES } from "@/domain/fulfillment";
import { users } from "./users";
import { products } from "./catalog";
import { orderItems, orders } from "./orders";
import { primaryId } from "./common";

/**
 * Archivo digital (PDF) de un producto DIGITAL. Vive en un almacenamiento PRIVADO: la base guarda solo la clave interna
 * (`storage_key`), nunca una URL pública. A lo sumo UN archivo activo por producto; al reemplazarlo, el anterior queda inactivo.
 */
export const digitalAssets = pgTable(
  "digital_assets",
  {
    id: primaryId(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull().unique(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull().default("application/pdf"),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    sha256: text("sha256").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("digital_assets_size_positive", sql`${t.sizeBytes} > 0`),
    index("digital_assets_product_idx").on(t.productId),
    uniqueIndex("digital_assets_one_active_per_product").on(t.productId).where(sql`${t.isActive}`),
  ],
);

/**
 * Enlaces de descarga TEMPORALES. Solo se guarda el HASH del token (si se filtra la base, los enlaces no sirven).
 * Cada descarga re-verifica en la base que el pedido siga PAGADO, así que revocar o reembolsar corta el acceso al instante.
 */
export const digitalDownloadLinks = pgTable(
  "digital_download_links",
  {
    id: primaryId(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    purpose: text("purpose", { enum: DOWNLOAD_PURPOSES }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    maxDownloads: integer("max_downloads").notNull(),
    downloadCount: integer("download_count").notNull().default(0),
    lastDownloadedAt: timestamp("last_downloaded_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("digital_links_counts", sql`${t.maxDownloads} > 0 AND ${t.downloadCount} >= 0 AND ${t.downloadCount} <= ${t.maxDownloads}`),
    index("digital_links_item_idx").on(t.orderItemId, t.purpose, t.createdAt),
    index("digital_links_order_idx").on(t.orderId),
  ],
);
