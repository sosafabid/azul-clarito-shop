import { inventoryEconomics, unitEconomics, type InventoryEconomics, type UnitEconomics } from "./product-economics";

export type StockState = "ok" | "low" | "out";

/** Sin stock = 0 disponibles. Stock bajo = hay, pero igual o menos que el umbral de alerta. */
export function stockState(availableStock: number, lowStockThreshold: number): StockState {
  if (availableStock <= 0) return "out";
  if (availableStock <= lowStockThreshold) return "low";
  return "ok";
}

export type InventoryItem = {
  inventoryId: string;
  productId: string;
  name: string;
  variantName: string | null;
  sku: string;
  status: string;
  currency: string;
  availableStock: number;
  reservedStock: number;
  soldStock: number;
  lowStockThreshold: number;
  price: number;
  cost: number | null;
  unit: UnitEconomics;
  inventory: InventoryEconomics;
  state: StockState;
};

/** Arma una fila de inventario con precio/costo efectivos (la variante pisa al producto). */
export function toInventoryItem(input: {
  inventoryId: string;
  productId: string;
  name: string;
  variantName: string | null;
  sku: string;
  status: string;
  currency: string;
  availableStock: number;
  reservedStock: number;
  soldStock: number;
  lowStockThreshold: number;
  productPrice: number;
  productCost: number | null;
  variantPrice: number | null;
  variantCost: number | null;
}): InventoryItem {
  const price = input.variantPrice ?? input.productPrice;
  const cost = input.variantCost ?? input.productCost;
  return {
    inventoryId: input.inventoryId,
    productId: input.productId,
    name: input.name,
    variantName: input.variantName,
    sku: input.sku,
    status: input.status,
    currency: input.currency,
    availableStock: input.availableStock,
    reservedStock: input.reservedStock,
    soldStock: input.soldStock,
    lowStockThreshold: input.lowStockThreshold,
    price,
    cost,
    unit: unitEconomics(price, cost),
    inventory: inventoryEconomics({ availableStock: input.availableStock, price, cost }),
    state: stockState(input.availableStock, input.lowStockThreshold),
  };
}

export const INVENTORY_FILTERS = ["all", "low", "out", "value", "profit"] as const;
export type InventoryFilter = (typeof INVENTORY_FILTERS)[number];

export const INVENTORY_FILTER_LABELS: Record<InventoryFilter, string> = {
  all: "Todos",
  low: "Stock bajo",
  out: "Sin stock",
  value: "Mayor valor de inventario",
  profit: "Mayor utilidad potencial",
};

export function isInventoryFilter(value: string | undefined): value is InventoryFilter {
  return !!value && (INVENTORY_FILTERS as readonly string[]).includes(value);
}

/** Valores `null` (costo desconocido) siempre al final. */
function byDescNullsLast(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

export function filterAndSortInventory(items: readonly InventoryItem[], filter: InventoryFilter): InventoryItem[] {
  const byName = (a: InventoryItem, b: InventoryItem) => a.name.localeCompare(b.name, "es") || a.sku.localeCompare(b.sku);
  switch (filter) {
    case "low":
      return items.filter((i) => i.state === "low").sort((a, b) => a.availableStock - b.availableStock || byName(a, b));
    case "out":
      return items.filter((i) => i.state === "out").sort(byName);
    case "value":
      return [...items].sort(
        (a, b) => byDescNullsLast(a.inventory.inventoryValueAtCost, b.inventory.inventoryValueAtCost) || byName(a, b),
      );
    case "profit":
      return [...items].sort(
        (a, b) => byDescNullsLast(a.inventory.potentialProfit, b.inventory.potentialProfit) || byName(a, b),
      );
    default:
      return [...items].sort(byName);
  }
}

export type InventorySummary = {
  /** Totales SOLO de filas en la moneda indicada y con costo conocido (donde aplica). */
  valueAtCost: number;
  potentialSalesValue: number;
  potentialProfit: number;
  /** Filas sin costo: no entran en el valor al costo ni en la utilidad potencial. */
  itemsWithoutCost: number;
  /** Filas en otra moneda: no se suman con las demás. */
  itemsInOtherCurrency: number;
  lowCount: number;
  outCount: number;
  totalItems: number;
};

export function summarizeInventory(items: readonly InventoryItem[], currency: string): InventorySummary {
  const summary: InventorySummary = {
    valueAtCost: 0,
    potentialSalesValue: 0,
    potentialProfit: 0,
    itemsWithoutCost: 0,
    itemsInOtherCurrency: 0,
    lowCount: 0,
    outCount: 0,
    totalItems: items.length,
  };
  for (const item of items) {
    if (item.state === "low") summary.lowCount += 1;
    if (item.state === "out") summary.outCount += 1;
    if (item.currency !== currency) {
      summary.itemsInOtherCurrency += 1;
      continue;
    }
    summary.potentialSalesValue += item.inventory.potentialSalesValue;
    if (item.inventory.inventoryValueAtCost === null) {
      summary.itemsWithoutCost += 1;
    } else {
      summary.valueAtCost += item.inventory.inventoryValueAtCost;
      summary.potentialProfit += item.inventory.potentialProfit ?? 0;
    }
  }
  return summary;
}
