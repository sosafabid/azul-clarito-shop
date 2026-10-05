import "server-only";
import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { inventory, productVariants, products } from "@/db/schema";
import { isUuid } from "@/domain/ids";
import type { ParsedVariant } from "@/domain/variant-form";
import { auditInsert, toAuditRow, type AuditActor } from "@/server/services/audit";
import { adjustAvailableStock } from "@/server/services/inventory/stock";
import { getAdminProduct, uniqueViolationConstraint } from "./admin";

/**
 * VARIANTES (talla, color, diseño…). Un producto sin variantes es un producto
 * simple con UNA fila de inventario. Al agregar la primera variante, el stock
 * pasa a gestionarse POR VARIANTE (una fila de inventario cada una).
 * Contiene costos: solo para el panel, detrás de `requirePermission`.
 */
export type AdminVariant = {
  id: string;
  productId: string;
  sku: string;
  name: string | null;
  options: Record<string, string>;
  price: number | null;
  cost: number | null;
  isActive: boolean;
  inventoryId: string | null;
  availableStock: number;
  reservedStock: number;
  soldStock: number;
};

export async function listProductVariants(db: Database, productId: string): Promise<AdminVariant[]> {
  const rows = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      sku: productVariants.sku,
      name: productVariants.name,
      options: productVariants.options,
      price: productVariants.price,
      cost: productVariants.cost,
      isActive: productVariants.isActive,
      inventoryId: inventory.id,
      availableStock: inventory.availableStock,
      reservedStock: inventory.reservedStock,
      soldStock: inventory.soldStock,
    })
    .from(productVariants)
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(eq(productVariants.productId, productId))
    .orderBy(asc(productVariants.sortOrder), asc(productVariants.createdAt));
  return rows.map((row) => ({
    ...row,
    availableStock: row.availableStock ?? 0,
    reservedStock: row.reservedStock ?? 0,
    soldStock: row.soldStock ?? 0,
  }));
}

export type VariantResult =
  | { ok: true }
  | { ok: false; code: "not_found" | "sku_taken" | "has_simple_stock" | "stock_conflict" | "blocked"; message: string };

const SKU_TAKEN: VariantResult = { ok: false, code: "sku_taken", message: "Ya existe un producto o variante con ese SKU. Elegí otro." };

async function skuClash(db: Database, sku: string, excludeVariantId?: string): Promise<boolean> {
  const [variant] = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(excludeVariantId ? and(eq(productVariants.sku, sku), ne(productVariants.id, excludeVariantId)) : eq(productVariants.sku, sku))
    .limit(1);
  if (variant) return true;
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.sku, sku)).limit(1);
  return Boolean(product);
}

export async function addVariant(db: Database, productId: string, input: ParsedVariant, actor: AuditActor): Promise<VariantResult> {
  const product = await getAdminProduct(db, productId);
  if (!product) return { ok: false, code: "not_found", message: "Producto no encontrado." };

  const hasSimpleStock = (product.availableStock ?? 0) > 0 || (product.reservedStock ?? 0) > 0 || (product.soldStock ?? 0) > 0;
  if (product.variantCount === 0 && hasSimpleStock) {
    return {
      ok: false,
      code: "has_simple_stock",
      message: `Este producto tiene stock propio (disponible ${product.availableStock ?? 0}, reservado ${product.reservedStock ?? 0}, vendido ${product.soldStock ?? 0}). Para usar variantes, primero poné su stock disponible en 0; después el stock se gestiona en cada variante.`,
    };
  }
  if (await skuClash(db, input.sku)) return SKU_TAKEN;

  const id = crypto.randomUUID();
  try {
    await db.batch([
      db.insert(productVariants).values({
        id,
        productId,
        sku: input.sku,
        name: input.name,
        options: input.options,
        price: input.price,
        cost: input.cost,
        isActive: input.isActive,
        sortOrder: product.variantCount,
      }),
      db.insert(inventory).values({
        productId,
        variantId: id,
        availableStock: input.availableStock,
        lowStockThreshold: product.lowStockThreshold ?? 0,
      }),
      // La fila de inventario "simple" ya no se usa (se comprobó arriba que está en cero).
      db
        .delete(inventory)
        .where(and(eq(inventory.productId, productId), isNull(inventory.variantId), sql`${inventory.availableStock} = 0 and ${inventory.reservedStock} = 0 and ${inventory.soldStock} = 0`)),
      auditInsert(db, actor, [
        {
          action: "product.variant_added",
          entityType: "product",
          entityId: productId,
          metadata: { variantId: id, variantSku: input.sku, options: input.options, price: input.price, cost: input.cost, availableStock: input.availableStock, productName: product.name, sku: product.sku },
        },
      ]),
    ]);
    return { ok: true };
  } catch (error) {
    if (uniqueViolationConstraint(error) !== null) return SKU_TAKEN;
    throw error;
  }
}

async function loadVariant(db: Database, variantId: string) {
  if (!isUuid(variantId)) return null;
  const [row] = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      sku: productVariants.sku,
      name: productVariants.name,
      options: productVariants.options,
      price: productVariants.price,
      cost: productVariants.cost,
      isActive: productVariants.isActive,
      inventoryId: inventory.id,
      availableStock: inventory.availableStock,
    })
    .from(productVariants)
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(eq(productVariants.id, variantId))
    .limit(1);
  return row ?? null;
}

export async function updateVariant(
  db: Database,
  variantId: string,
  input: ParsedVariant,
  actor: AuditActor,
  expectedAvailableStock?: number,
): Promise<VariantResult> {
  const current = await loadVariant(db, variantId);
  if (!current) return { ok: false, code: "not_found", message: "Variante no encontrada." };
  const product = await getAdminProduct(db, current.productId);
  if (!product) return { ok: false, code: "not_found", message: "Producto no encontrado." };
  if (await skuClash(db, input.sku, variantId)) return SKU_TAKEN;

  const currentStock = current.availableStock ?? 0;
  const expected = expectedAvailableStock ?? currentStock;
  const stockChanged = input.availableStock !== expected;
  const conflict = (stock: number): VariantResult => ({
    ok: false,
    code: "stock_conflict",
    message: `El stock de la variante cambió mientras editabas (ahora hay ${stock}). Revisá el número y guardá de nuevo.`,
  });
  if (stockChanged && currentStock !== expected) return conflict(currentStock);

  const fields: string[] = [];
  if ((current.name ?? "") !== input.name) fields.push("name");
  if (current.sku !== input.sku) fields.push("sku");
  if (JSON.stringify(current.options) !== JSON.stringify(input.options)) fields.push("options");
  if (current.price !== input.price) fields.push("price");
  if (current.cost !== input.cost) fields.push("cost");
  if (current.isActive !== input.isActive) fields.push("isActive");
  if (stockChanged) fields.push("availableStock");
  if (fields.length === 0) return { ok: true };

  const meta = { variantId, productName: product.name, sku: product.sku };

  if (stockChanged && current.inventoryId) {
    const applied = await adjustAvailableStock(db, {
      inventoryId: current.inventoryId,
      expected,
      next: input.availableStock,
      actor,
      audit: { action: "product.stock_changed", entityType: "product", entityId: current.productId, metadata: { ...meta, variantSku: input.sku, field: "availableStock", from: expected, to: input.availableStock } },
    });
    if (!applied) return conflict(currentStock);
  }

  try {
    await db.batch([
      db
        .update(productVariants)
        .set({ name: input.name, sku: input.sku, options: input.options, price: input.price, cost: input.cost, isActive: input.isActive })
        .where(eq(productVariants.id, variantId)),
      auditInsert(db, actor, [
        {
          action: "product.variant_updated",
          entityType: "product",
          entityId: current.productId,
          metadata: {
            ...meta,
            variantSku: input.sku,
            fields,
            ...(fields.includes("price") ? { price: { from: current.price, to: input.price } } : {}),
            ...(fields.includes("cost") ? { cost: { from: current.cost, to: input.cost } } : {}),
          },
        },
      ]),
    ]);
    return { ok: true };
  } catch (error) {
    if (uniqueViolationConstraint(error) !== null) return SKU_TAKEN;
    throw error;
  }
}

export async function setVariantActive(db: Database, variantId: string, active: boolean, actor: AuditActor): Promise<VariantResult> {
  const current = await loadVariant(db, variantId);
  if (!current) return { ok: false, code: "not_found", message: "Variante no encontrada." };
  if (current.isActive === active) return { ok: true };
  await db.batch([
    db.update(productVariants).set({ isActive: active }).where(eq(productVariants.id, variantId)),
    auditInsert(db, actor, [
      { action: active ? "product.variant_activated" : "product.variant_deactivated", entityType: "product", entityId: current.productId, metadata: { variantId, variantSku: current.sku } },
    ]),
  ]);
  return { ok: true };
}

/** Elimina una variante solo si no tiene historial de ventas (evaluado dentro de la misma sentencia). */
export async function deleteVariant(db: Database, variantId: string, actor: AuditActor): Promise<VariantResult> {
  const current = await loadVariant(db, variantId);
  if (!current) return { ok: false, code: "not_found", message: "Variante no encontrada." };

  const row = toAuditRow(actor, { action: "product.variant_deleted", entityType: "product", entityId: current.productId, metadata: {} });
  const result = await db.execute(sql`
    with del as (
      delete from product_variants v
       where v.id = ${variantId}
         and not exists (select 1 from order_items oi where oi.variant_id = v.id)
         and not exists (select 1 from inventory i where i.variant_id = v.id and i.sold_stock > 0)
      returning v.id, v.sku, v.product_id
    )
    insert into audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    select ${row.actorUserId ?? null}::uuid, 'product.variant_deleted', 'product', del.product_id::text,
           jsonb_build_object('variantId', del.id::text, 'variantSku', del.sku, 'actor', ${actor.label}::text)
      from del
    returning id
  `);
  if (result.rows.length === 0) {
    return { ok: false, code: "blocked", message: "Esta variante tiene historial de ventas: no se puede eliminar, pero sí desactivar." };
  }
  return { ok: true };
}
