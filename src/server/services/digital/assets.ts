import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { digitalAssets, products } from "@/db/schema";
import { DIGITAL_FILE } from "@/domain/fulfillment";
import { isUuid } from "@/domain/ids";
import { auditInsert, type AuditActor } from "@/server/services/audit";
import { deleteDigitalBlobs, inspectDigitalBlob } from "./storage";

/** Archivo digital de un producto (administración). Nunca expone la clave interna de almacenamiento. */
export type AdminDigitalAsset = { id: string; fileName: string; sizeBytes: number; sha256: string; createdAt: Date };

export async function getActiveDigitalAsset(db: Database, productId: string): Promise<AdminDigitalAsset | null> {
  const [row] = await db
    .select({ id: digitalAssets.id, fileName: digitalAssets.fileName, sizeBytes: digitalAssets.sizeBytes, sha256: digitalAssets.sha256, createdAt: digitalAssets.createdAt })
    .from(digitalAssets)
    .where(and(eq(digitalAssets.productId, productId), eq(digitalAssets.isActive, true)))
    .orderBy(desc(digitalAssets.createdAt))
    .limit(1);
  return row ?? null;
}

/** La clave tiene que ser exactamente `digital/<producto>/<uuid>.pdf`: nadie puede apuntar un producto a un archivo ajeno. */
export function expectedKeyPattern(productId: string): RegExp {
  return new RegExp(`^${DIGITAL_FILE.keyPrefix}/${productId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.pdf$`);
}

export type AttachResult = { ok: true; replaced: boolean } | { ok: false; message: string };

/**
 * Vincula un PDF YA SUBIDO al almacén privado con un producto DIGITAL. Antes de guardar nada comprueba, leyendo el archivo desde el
 * servidor, que existe, que es un PDF de verdad (firma de bytes) y que no supera el tope, y calcula su huella SHA-256.
 * El archivo anterior queda inactivo (en el mismo lote atómico) y se borra del almacén después.
 */
export async function attachDigitalAsset(db: Database, input: { productId: string; pathname: string; fileName: string; actor: AuditActor }): Promise<AttachResult> {
  if (!isUuid(input.productId)) return { ok: false, message: "Producto inválido." };
  if (!expectedKeyPattern(input.productId).test(input.pathname)) return { ok: false, message: "El archivo no corresponde a este producto." };
  const [product] = await db.select({ id: products.id, name: products.name, type: products.productType }).from(products).where(eq(products.id, input.productId)).limit(1);
  if (!product) return { ok: false, message: "Producto no encontrado." };
  if (product.type !== "DIGITAL") return { ok: false, message: "Este producto es físico: cambiá su tipo a digital para asociarle un PDF." };

  const [already] = await db.select({ id: digitalAssets.id, active: digitalAssets.isActive }).from(digitalAssets).where(eq(digitalAssets.storageKey, input.pathname)).limit(1);
  if (already) return { ok: true, replaced: false }; // doble envío del formulario: ya estaba vinculado

  const inspected = await inspectDigitalBlob(input.pathname);
  if (!inspected.ok) return inspected;

  const previous = await db.select({ key: digitalAssets.storageKey }).from(digitalAssets).where(and(eq(digitalAssets.productId, input.productId), eq(digitalAssets.isActive, true)));
  const fileName = input.fileName.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 120) || "libro.pdf";
  await db.batch([
    db.update(digitalAssets).set({ isActive: false }).where(and(eq(digitalAssets.productId, input.productId), eq(digitalAssets.isActive, true))),
    db.insert(digitalAssets).values({
      productId: input.productId,
      storageKey: input.pathname,
      fileName,
      contentType: DIGITAL_FILE.contentType,
      sizeBytes: inspected.size,
      sha256: inspected.sha256,
      uploadedBy: input.actor.actorUserId,
    }),
    auditInsert(db, input.actor, [
      { action: "product.digital_asset_attached", entityType: "product", entityId: input.productId, metadata: { productName: product.name, fileName, sizeBytes: inspected.size, sha256: inspected.sha256, replaced: previous.length > 0 } },
    ]),
  ]);
  // El archivo reemplazado ya no lo usa nadie (las descargas siempre toman el archivo activo del producto).
  await deleteDigitalBlobs(previous.map((p) => p.key));
  return { ok: true, replaced: previous.length > 0 };
}

/** ¿Hay compras de este producto? (para avisar al reemplazar el archivo: las clientas descargan la versión nueva). */
export async function countProductSales(db: Database, productId: string): Promise<number> {
  const result = await db.execute(sql`select count(*)::int as n from order_items where product_id = ${productId}::uuid and fulfillment_type = 'DIGITAL'`);
  return Number((result.rows[0] as { n?: number } | undefined)?.n ?? 0);
}
