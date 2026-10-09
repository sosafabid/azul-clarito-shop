import "server-only";
import { and, count, desc, eq, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { Database } from "@/db/client";
import { categories, collections, inventory, orderItems, productImages, productVariants, products } from "@/db/schema";
import type { ProductStatus } from "@/domain/catalog";
import { isUuid } from "@/domain/ids";
import { toInventoryItem } from "@/domain/inventory-view";
import { changedProductFields, diffProductEconomics, type ProductEditableFields } from "@/domain/product-audit";
import type { ParsedProduct } from "@/domain/product-form";
import {
  PRODUCT_ACTION_RULES,
  canApplyAction,
  escapeLike,
  statusesForFilter,
  type DeleteBlocker,
  type ProductAction,
  type ProductFilter,
} from "@/domain/product-lifecycle";
import { auditInsert, toAuditRow, type AuditActor } from "@/server/services/audit";
import { adjustAvailableStock } from "@/server/services/inventory/stock";
import { resolveTaxonomy } from "./taxonomy";

/**
 * ADMINISTRACIÓN DE PRODUCTOS — contiene el COSTO (información interna).
 *
 * Solo se usa desde páginas y Server Actions del panel, detrás de
 * `requirePermission(...)`. Las consultas del sitio público están en
 * `catalog/queries.ts` y NO incluyen el costo.
 *
 * Escrituras: el driver HTTP de Neon no soporta `db.transaction()`. Se usa
 * `db.batch([...])` (una transacción con varias sentencias: o se guarda todo o
 * nada) y, donde hace falta una condición, UNA sola sentencia con CTE.
 */
export type AdminProduct = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  status: ProductStatus;
  isFeatured: boolean;
  isNew: boolean;
  isLimitedEdition: boolean;
  currency: string;
  price: number;
  cost: number | null;
  categoryId: string | null;
  categoryName: string | null;
  collectionId: string | null;
  collectionName: string | null;
  /** Fila de inventario del producto "simple" (sin variantes). `null` = no tiene. */
  inventoryId: string | null;
  availableStock: number | null;
  reservedStock: number | null;
  soldStock: number | null;
  lowStockThreshold: number | null;
  variantCount: number;
  updatedAt: Date;
};

const adminProductColumns = {
  id: products.id,
  slug: products.slug,
  sku: products.sku,
  name: products.name,
  shortDescription: products.shortDescription,
  description: products.description,
  status: products.status,
  isFeatured: products.isFeatured,
  isNew: products.isNew,
  isLimitedEdition: products.isLimitedEdition,
  currency: products.currency,
  price: products.price,
  cost: products.cost,
  categoryId: products.categoryId,
  categoryName: categories.name,
  collectionId: products.collectionId,
  collectionName: collections.name,
  inventoryId: inventory.id,
  availableStock: inventory.availableStock,
  reservedStock: inventory.reservedStock,
  soldStock: inventory.soldStock,
  lowStockThreshold: inventory.lowStockThreshold,
  variantCount: sql<number>`(select count(*) from product_variants pv where pv.product_id = ${products.id})`.mapWith(Number),
  updatedAt: products.updatedAt,
} as const;

function baseSelect(db: Database) {
  return db
    .select(adminProductColumns)
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(collections, eq(collections.id, products.collectionId))
    .leftJoin(inventory, and(eq(inventory.productId, products.id), isNull(inventory.variantId)));
}

// ── Lectura ─────────────────────────────────────────────────────────────
/** Totales de inventario de un producto (suma de su fila simple o de todas sus variantes). */
export type StockSummary = {
  available: number;
  reserved: number;
  sold: number;
  /** Valor al costo de lo disponible. `null` si ninguna fila tiene costo conocido. */
  valueAtCost: number | null;
  potentialSales: number;
  potentialProfit: number | null;
  rowsWithoutCost: number;
};

export type AdminProductListItem = AdminProduct & { stock: StockSummary };

export async function getStockSummaries(db: Database, productIds: readonly string[]): Promise<Map<string, StockSummary>> {
  const map = new Map<string, StockSummary>();
  if (productIds.length === 0) return map;

  const rows = await db
    .select({
      inventoryId: inventory.id,
      productId: products.id,
      name: products.name,
      variantName: productVariants.name,
      productSku: products.sku,
      variantSku: productVariants.sku,
      status: products.status,
      currency: products.currency,
      availableStock: inventory.availableStock,
      reservedStock: inventory.reservedStock,
      soldStock: inventory.soldStock,
      lowStockThreshold: inventory.lowStockThreshold,
      productPrice: products.price,
      productCost: products.cost,
      variantPrice: productVariants.price,
      variantCost: productVariants.cost,
    })
    .from(inventory)
    .innerJoin(products, eq(inventory.productId, products.id))
    .leftJoin(productVariants, eq(inventory.variantId, productVariants.id))
    .where(inArray(inventory.productId, [...productIds]));

  for (const row of rows) {
    const item = toInventoryItem({
      inventoryId: row.inventoryId,
      productId: row.productId,
      name: row.name,
      variantName: row.variantName,
      sku: row.variantSku ?? row.productSku,
      status: row.status,
      currency: row.currency,
      availableStock: row.availableStock,
      reservedStock: row.reservedStock,
      soldStock: row.soldStock,
      lowStockThreshold: row.lowStockThreshold,
      productPrice: row.productPrice,
      productCost: row.productCost,
      variantPrice: row.variantPrice,
      variantCost: row.variantCost,
    });
    const acc =
      map.get(row.productId) ??
      { available: 0, reserved: 0, sold: 0, valueAtCost: null, potentialSales: 0, potentialProfit: null, rowsWithoutCost: 0 };
    acc.available += item.availableStock;
    acc.reserved += item.reservedStock;
    acc.sold += item.soldStock;
    acc.potentialSales += item.inventory.potentialSalesValue;
    if (item.inventory.inventoryValueAtCost === null) acc.rowsWithoutCost += 1;
    else {
      acc.valueAtCost = (acc.valueAtCost ?? 0) + item.inventory.inventoryValueAtCost;
      acc.potentialProfit = (acc.potentialProfit ?? 0) + (item.inventory.potentialProfit ?? 0);
    }
    map.set(row.productId, acc);
  }
  return map;
}

const EMPTY_STOCK: StockSummary = { available: 0, reserved: 0, sold: 0, valueAtCost: null, potentialSales: 0, potentialProfit: null, rowsWithoutCost: 0 };

export const LIST_LIMIT = 200;

export type AdminProductList = {
  items: AdminProductListItem[];
  /** Cantidad de productos que cumplen filtro y búsqueda (puede ser mayor que `items.length`). */
  matching: number;
  /** Cantidad por estado en TODO el catálogo (para los contadores de los filtros). */
  counts: Record<ProductFilter, number>;
};

export async function listAdminProducts(
  db: Database,
  options: { filter: ProductFilter; search: string },
): Promise<AdminProductList> {
  const statuses = [...statusesForFilter(options.filter)];
  const pattern = `%${escapeLike(options.search)}%`;
  const where = and(
    inArray(products.status, statuses),
    options.search ? or(ilike(products.name, pattern), ilike(products.sku, pattern), ilike(products.slug, pattern)) : undefined,
  );

  const [rows, [matchingRow], statusRows] = await Promise.all([
    baseSelect(db).where(where).orderBy(desc(products.updatedAt)).limit(LIST_LIMIT),
    db.select({ n: count() }).from(products).where(where),
    db.select({ status: products.status, n: count() }).from(products).groupBy(products.status),
  ]);

  const summaries = await getStockSummaries(db, rows.map((row) => row.id));
  const byStatus = new Map(statusRows.map((r) => [r.status, r.n]));
  const total = statusRows.reduce((sum, r) => sum + r.n, 0);

  return {
    items: rows.map((row) => ({ ...row, stock: summaries.get(row.id) ?? EMPTY_STOCK })),
    matching: matchingRow?.n ?? 0,
    counts: {
      todos: total,
      activos: byStatus.get("ACTIVE") ?? 0,
      ocultos: byStatus.get("DRAFT") ?? 0,
      archivados: byStatus.get("ARCHIVED") ?? 0,
    },
  };
}

export async function getAdminProduct(db: Database, id: string): Promise<AdminProduct | null> {
  if (!isUuid(id)) return null;
  const rows = await baseSelect(db).where(eq(products.id, id)).limit(1);
  return rows[0] ?? null;
}

// ── Escritura ───────────────────────────────────────────────────────────
export type ImageRef = { url: string; storageKey?: string | null };

export type SaveProductResult =
  | { ok: true; id: string }
  | {
      ok: false;
      code: "slug_taken" | "sku_taken" | "not_found" | "stock_conflict" | "invalid_taxonomy";
      message: string;
      errors?: Record<string, string>;
      currentStock?: number;
    };

const SLUG_TAKEN: SaveProductResult = { ok: false, code: "slug_taken", message: "Ya existe un producto con ese slug. Elegí otro." };
const SKU_TAKEN: SaveProductResult = { ok: false, code: "sku_taken", message: "Ya existe un producto con ese SKU. Elegí otro." };

/** Busca (recorriendo `cause`) el error de PostgreSQL de "valor duplicado" (23505). */
export function uniqueViolationConstraint(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    const candidate = current as { code?: string; constraint?: string; cause?: unknown };
    if (candidate.code === "23505") return candidate.constraint ?? "";
    current = candidate.cause;
  }
  return null;
}

function translateUniqueViolation(error: unknown): SaveProductResult | null {
  const constraint = uniqueViolationConstraint(error);
  if (constraint === null) return null;
  if (constraint.includes("slug")) return SLUG_TAKEN;
  if (constraint.includes("sku")) return SKU_TAKEN;
  return null;
}

async function findUniqueClash(db: Database, slug: string, sku: string, excludeId?: string) {
  const clash = or(eq(products.slug, slug), eq(products.sku, sku));
  const rows = await db
    .select({ slug: products.slug, sku: products.sku })
    .from(products)
    .where(excludeId ? and(clash, ne(products.id, excludeId)) : clash)
    .limit(5);
  if (rows.some((row) => row.slug === slug)) return SLUG_TAKEN;
  if (rows.some((row) => row.sku === sku)) return SKU_TAKEN;
  return null;
}

export async function createProduct(
  db: Database,
  input: ParsedProduct,
  actor: AuditActor,
  images: readonly ImageRef[] = [],
  presetId?: string,
): Promise<SaveProductResult> {
  const status: ProductStatus = input.status ?? "DRAFT";
  const clash = await findUniqueClash(db, input.slug, input.sku);
  if (clash) return clash;

  const taxonomy = await resolveTaxonomy(db, input);
  if (!taxonomy.ok) return { ok: false, code: "invalid_taxonomy", message: "Revisá la categoría y la colección.", errors: taxonomy.errors };

  // El id se genera aquí para poder enlazar producto, inventario, imágenes y auditoría en un solo lote.
  const id = presetId && isUuid(presetId) ? presetId : crypto.randomUUID();
  const statements: [BatchItem<"pg">, ...BatchItem<"pg">[]] = [
    db.insert(products).values({
      id,
      slug: input.slug,
      sku: input.sku,
      name: input.name,
      shortDescription: input.shortDescription,
      description: input.description,
      price: input.price,
      cost: input.cost,
      currency: input.currency,
      categoryId: taxonomy.categoryId,
      collectionId: taxonomy.collectionId,
      status,
      isFeatured: input.isFeatured,
      isNew: input.isNew,
      isLimitedEdition: input.isLimitedEdition,
    }),
    db.insert(inventory).values({
      productId: id,
      variantId: null,
      availableStock: input.availableStock,
      lowStockThreshold: input.lowStockThreshold,
    }),
  ];
  if (images.length > 0) {
    statements.push(
      db.insert(productImages).values(
        images.map((image, index) => ({
          productId: id,
          url: image.url,
          storageKey: image.storageKey ?? null,
          alt: input.name,
          sortOrder: index,
          isPrimary: index === 0,
        })),
      ),
    );
  }
  statements.push(
    auditInsert(db, actor, [
      {
        action: "product.created",
        entityType: "product",
        entityId: id,
        metadata: {
          name: input.name,
          sku: input.sku,
          price: input.price,
          cost: input.cost,
          currency: input.currency,
          availableStock: input.availableStock,
          status,
          images: images.length,
        },
      },
    ]),
  );

  try {
    await db.batch(statements);
    return { ok: true, id };
  } catch (error) {
    const translated = translateUniqueViolation(error);
    if (translated) return translated;
    throw error;
  }
}

/**
 * Edita un producto (NO cambia su estado: eso lo hacen las acciones
 * publicar / ocultar / archivar / restaurar).
 *
 * Stock y concurrencia: el formulario envía el stock que la persona VIO al
 * abrirlo (`expectedAvailableStock`). Si esa persona cambió el stock y el valor
 * real ya es otro (por ejemplo, porque otra compra reservó unidades), se
 * rechaza en vez de pisar el cambio. Si no tocó el stock, nunca se modifica.
 * Si el producto tiene variantes, el stock se gestiona en cada variante.
 *
 * Los pedidos históricos no se tocan: sus precios y costos son snapshots en
 * `order_items`.
 */
export async function updateProduct(
  db: Database,
  id: string,
  input: ParsedProduct,
  actor: AuditActor,
  expectedAvailableStock?: number,
): Promise<SaveProductResult> {
  const current = await getAdminProduct(db, id);
  if (!current) return { ok: false, code: "not_found", message: "Producto no encontrado." };

  const clash = await findUniqueClash(db, input.slug, input.sku, id);
  if (clash) return clash;

  const taxonomy = await resolveTaxonomy(db, input);
  if (!taxonomy.ok) return { ok: false, code: "invalid_taxonomy", message: "Revisá la categoría y la colección.", errors: taxonomy.errors };

  const hasVariants = current.variantCount > 0;
  const currentStock = current.availableStock ?? 0;
  const expected = expectedAvailableStock ?? currentStock;
  const adminChangedStock = !hasVariants && input.availableStock !== expected;

  const stockConflict = (stock: number): SaveProductResult => ({
    ok: false,
    code: "stock_conflict",
    currentStock: stock,
    message: `El stock cambió mientras editabas (ahora hay ${stock}). Revisá el número y guardá de nuevo.`,
  });
  if (adminChangedStock && currentStock !== expected) return stockConflict(currentStock);

  const finalStock = adminChangedStock ? input.availableStock : currentStock;
  const before: ProductEditableFields = {
    name: current.name, slug: current.slug, sku: current.sku, shortDescription: current.shortDescription,
    description: current.description, categoryId: current.categoryId, collectionId: current.collectionId,
    isFeatured: current.isFeatured, isNew: current.isNew, isLimitedEdition: current.isLimitedEdition,
    price: current.price, cost: current.cost, currency: current.currency,
    lowStockThreshold: current.lowStockThreshold ?? 0, availableStock: currentStock,
  };
  const after: ProductEditableFields = {
    name: input.name, slug: input.slug, sku: input.sku, shortDescription: input.shortDescription,
    description: input.description, categoryId: taxonomy.categoryId, collectionId: taxonomy.collectionId,
    isFeatured: input.isFeatured, isNew: input.isNew, isLimitedEdition: input.isLimitedEdition,
    price: input.price, cost: input.cost, currency: input.currency,
    lowStockThreshold: input.lowStockThreshold, availableStock: finalStock,
  };
  const changedFields = changedProductFields(before, after);
  if (changedFields.length === 0) return { ok: true, id };

  // 1) Cambio de stock sobre una fila existente: UNA sentencia atómica y condicionada (con su auditoría).
  if (adminChangedStock && current.inventoryId) {
    const applied = await adjustAvailableStock(db, {
      inventoryId: current.inventoryId,
      expected,
      next: input.availableStock,
      actor,
      audit: {
        action: "product.stock_changed",
        entityType: "product",
        entityId: id,
        metadata: { field: "availableStock", from: expected, to: input.availableStock, productName: input.name, sku: input.sku },
      },
    });
    if (!applied) return stockConflict(currentStock);
  }

  // 2) Resto de los cambios: un solo lote atómico (producto + inventario + auditoría).
  const economicChanges = diffProductEconomics(
    { price: before.price, cost: before.cost, currency: before.currency, availableStock: currentStock },
    { price: after.price, cost: after.cost, currency: after.currency, availableStock: finalStock },
  ).filter((change) => !(change.field === "availableStock" && current.inventoryId));

  const statements: [BatchItem<"pg">, ...BatchItem<"pg">[]] = [
    db
      .update(products)
      .set({
        slug: input.slug,
        sku: input.sku,
        name: input.name,
        shortDescription: input.shortDescription,
        description: input.description,
        price: input.price,
        cost: input.cost,
        currency: input.currency,
        categoryId: taxonomy.categoryId,
        collectionId: taxonomy.collectionId,
        isFeatured: input.isFeatured,
        isNew: input.isNew,
        isLimitedEdition: input.isLimitedEdition,
      })
      .where(eq(products.id, id)),
    // El umbral de "stock bajo" es del producto: aplica a su fila simple y a todas sus variantes.
    db.update(inventory).set({ lowStockThreshold: input.lowStockThreshold }).where(eq(inventory.productId, id)),
  ];

  if (!current.inventoryId && !hasVariants) {
    statements.push(
      db.insert(inventory).values({ productId: id, variantId: null, availableStock: finalStock, lowStockThreshold: input.lowStockThreshold }),
    );
  }

  statements.push(
    auditInsert(db, actor, [
      {
        action: "product.updated",
        entityType: "product",
        entityId: id,
        metadata: { fields: changedFields, productName: input.name, sku: input.sku },
      },
      ...economicChanges.map((change) => ({
        action: change.action,
        entityType: "product",
        entityId: id,
        metadata: { field: change.field, from: change.from, to: change.to, productName: input.name, sku: input.sku },
      })),
    ]),
  );

  try {
    await db.batch(statements);
    return { ok: true, id };
  } catch (error) {
    const translated = translateUniqueViolation(error);
    if (translated) return translated;
    throw error;
  }
}

// ── Ciclo de vida: publicar / ocultar / archivar / restaurar ────────────
export type ActionResult =
  | { ok: true; status: ProductStatus }
  | { ok: false; code: "not_found" | "invalid_transition" | "conflict"; message: string };

/**
 * Cambia el estado con UNA sentencia: solo se aplica si el producto sigue en el
 * estado que la persona veía (si alguien más lo cambió, no se pisa) y escribe la
 * auditoría en el mismo instante.
 */
export async function applyProductAction(db: Database, id: string, action: ProductAction, actor: AuditActor): Promise<ActionResult> {
  const current = await getAdminProduct(db, id);
  if (!current) return { ok: false, code: "not_found", message: "Producto no encontrado." };

  const rule = PRODUCT_ACTION_RULES[action];
  if (!canApplyAction(action, current.status)) {
    return { ok: false, code: "invalid_transition", message: `No se puede “${rule.label.toLowerCase()}” un producto que está ${current.status === "ACTIVE" ? "activo" : current.status === "DRAFT" ? "oculto" : "archivado"}.` };
  }

  const row = toAuditRow(actor, {
    action: rule.audit,
    entityType: "product",
    entityId: id,
    metadata: { field: "status", from: current.status, to: rule.to, productName: current.name, sku: current.sku },
  });
  const result = await db.execute(sql`
    with upd as (
      update products
         set status = ${rule.to}::product_status, updated_at = now()
       where id = ${id} and status = ${current.status}::product_status
      returning id
    )
    insert into audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    select ${row.actorUserId ?? null}::uuid, ${row.action}::text, ${row.entityType}::text,
           ${row.entityId ?? null}::text, ${JSON.stringify(row.metadata)}::jsonb
      from upd
    returning id
  `);
  if (result.rows.length === 0) {
    return { ok: false, code: "conflict", message: "El producto cambió de estado mientras tanto. Recargá la página." };
  }
  return { ok: true, status: rule.to };
}

// ── Eliminación definitiva ──────────────────────────────────────────────
export type DeleteInfo = {
  product: AdminProduct;
  blockers: DeleteBlocker[];
  imageCount: number;
  variantCount: number;
};

/** ¿Por qué NO se puede eliminar? (vacío = se puede). */
export async function getDeleteBlockers(db: Database, id: string): Promise<DeleteBlocker[]> {
  const blockers: DeleteBlocker[] = [];
  const [order] = await db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.productId, id)).limit(1);
  if (order) blockers.push("has_orders");
  const [sold] = await db
    .select({ id: inventory.id })
    .from(inventory)
    .where(and(eq(inventory.productId, id), sql`${inventory.soldStock} > 0`))
    .limit(1);
  if (sold) blockers.push("has_sales");
  return blockers;
}

export async function getDeleteInfo(db: Database, id: string): Promise<DeleteInfo | null> {
  const product = await getAdminProduct(db, id);
  if (!product) return null;
  const [blockers, [images]] = await Promise.all([
    getDeleteBlockers(db, id),
    db.select({ n: count() }).from(productImages).where(eq(productImages.productId, id)),
  ]);
  return { product, blockers, imageCount: images?.n ?? 0, variantCount: product.variantCount };
}

export type DeleteResult =
  | { ok: true; storedImages: { url: string; storageKey: string }[] }
  | { ok: false; code: "not_found" | "blocked"; message: string; blockers?: DeleteBlocker[] };

/**
 * Elimina un producto de forma DEFINITIVA (sus imágenes, variantes e inventario
 * se borran en cascada). La condición "sin historial de ventas" se evalúa DENTRO
 * de la misma sentencia que borra, así que no puede colarse un pedido entre la
 * comprobación y el borrado. La auditoría se escribe en la misma sentencia.
 */
export async function deleteProduct(db: Database, id: string, actor: AuditActor): Promise<DeleteResult> {
  const info = await getDeleteInfo(db, id);
  if (!info) return { ok: false, code: "not_found", message: "Producto no encontrado." };

  const stored = await db
    .select({ url: productImages.url, storageKey: productImages.storageKey })
    .from(productImages)
    .where(and(eq(productImages.productId, id), sql`${productImages.storageKey} is not null`));

  const row = toAuditRow(actor, { action: "product.deleted", entityType: "product", entityId: id, metadata: {} });
  const result = await db.execute(sql`
    with del as (
      delete from products p
       where p.id = ${id}
         and not exists (select 1 from order_items oi where oi.product_id = p.id)
         and not exists (select 1 from inventory i where i.product_id = p.id and i.sold_stock > 0)
      returning p.id, p.name, p.sku, p.slug, p.status
    )
    insert into audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    select ${row.actorUserId ?? null}::uuid, 'product.deleted', 'product', del.id::text,
           jsonb_build_object('name', del.name, 'sku', del.sku, 'slug', del.slug, 'status', del.status::text,
                              'variants', ${info.variantCount}::int, 'images', ${info.imageCount}::int,
                              'actor', ${actor.label}::text)
      from del
    returning id
  `);

  if (result.rows.length === 0) {
    const blockers = await getDeleteBlockers(db, id);
    return { ok: false, code: "blocked", blockers, message: "Este producto tiene historial de ventas: no se puede eliminar, pero sí archivar." };
  }
  return { ok: true, storedImages: stored.flatMap((s) => (s.storageKey ? [{ url: s.url, storageKey: s.storageKey }] : [])) };
}
