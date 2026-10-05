import "server-only";
import { eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { inventory, productVariants, products } from "@/db/schema";
import { toInventoryItem, type InventoryItem } from "@/domain/inventory-view";

/**
 * Inventario para el panel admin (disponible / reservado / vendido) con precio y
 * costo ACTUALES. Incluye costo: solo para uso interno detrás de un guard.
 * Una fila por unidad vendible (producto simple o variante).
 */
export async function listInventoryItems(db: Database): Promise<InventoryItem[]> {
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
    .leftJoin(productVariants, eq(inventory.variantId, productVariants.id));

  return rows.map((row) =>
    toInventoryItem({
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
    }),
  );
}
