/**
 * Economía de un producto (cálculos puros).
 *
 * Todos los montos son enteros en la unidad de la moneda (ver `money.ts`).
 * `cost = null` significa "costo desconocido": en ese caso NO se inventa un
 * margen, simplemente no se calcula.
 *
 * Esto es utilidad BRUTA (precio − costo del producto). No incluye gastos
 * operativos, empaque, comisiones ni publicidad.
 */
export type UnitEconomics = {
  costKnown: boolean;
  /** precio − costo (por unidad). `null` si no hay costo. */
  grossProfitPerUnit: number | null;
  /** (precio − costo) / precio × 100. `null` si no hay costo o el precio es 0. */
  marginPercent: number | null;
  /** Se vende por debajo de su costo. */
  isLoss: boolean;
};

export function unitEconomics(price: number, cost: number | null): UnitEconomics {
  if (cost === null) {
    return { costKnown: false, grossProfitPerUnit: null, marginPercent: null, isLoss: false };
  }
  const grossProfitPerUnit = price - cost;
  return {
    costKnown: true,
    grossProfitPerUnit,
    marginPercent: price > 0 ? (grossProfitPerUnit / price) * 100 : null,
    isLoss: grossProfitPerUnit < 0,
  };
}

export type InventoryEconomics = {
  /** stock disponible × costo. `null` si no hay costo. */
  inventoryValueAtCost: number | null;
  /** stock disponible × precio de venta. */
  potentialSalesValue: number;
  /** stock disponible × (precio − costo). `null` si no hay costo. */
  potentialProfit: number | null;
};

export function inventoryEconomics(input: {
  availableStock: number;
  price: number;
  cost: number | null;
}): InventoryEconomics {
  const { availableStock, price, cost } = input;
  return {
    inventoryValueAtCost: cost === null ? null : availableStock * cost,
    potentialSalesValue: availableStock * price,
    potentialProfit: cost === null ? null : availableStock * (price - cost),
  };
}

/** Margen bruto agregado a partir de totales (ventas y costo de lo vendido). */
export function marginFromTotals(sales: number, cost: number): number | null {
  return sales > 0 ? ((sales - cost) / sales) * 100 : null;
}

/** 42,5 → "42,5%" (coma decimal, como el resto de la tienda). */
export function formatPercent(value: number | null, fractionDigits = 1): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value.toFixed(fractionDigits).replace(".", ",")}%`;
}
