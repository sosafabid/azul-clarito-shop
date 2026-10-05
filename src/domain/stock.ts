/**
 * Reglas puras de inventario (anti-overselling).
 *
 *   availableStock : unidades que se pueden vender ahora mismo
 *   reservedStock  : unidades retenidas por checkouts en curso
 *   soldStock      : unidades ya vendidas (acumulado)
 *
 * Flujo:
 *   reservar  → available -= n ; reserved += n
 *   confirmar → reserved  -= n ; sold     += n   (pago confirmado)
 *   liberar   → reserved  -= n ; available += n   (pago fallido / expiró)
 *
 * Estas funciones SOLO describen la regla. Cuando se implemente el checkout,
 * la escritura real en la base de datos debe ser atómica y condicionada, por
 * ejemplo:
 *
 *   UPDATE inventory
 *      SET available_stock = available_stock - $n,
 *          reserved_stock  = reserved_stock  + $n
 *    WHERE id = $id AND available_stock >= $n;
 *
 * (si no se actualiza ninguna fila, no hay stock). Los CHECK de la tabla son
 * la última barrera: la base de datos rechaza stock negativo.
 */
export type StockLevels = {
  availableStock: number;
  reservedStock: number;
  soldStock: number;
};

export class InsufficientStockError extends Error {
  constructor(requested: number, available: number) {
    super(`Stock insuficiente: se pidieron ${requested} y hay ${available}.`);
    this.name = "InsufficientStockError";
  }
}

function assertPositiveInteger(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new RangeError("La cantidad debe ser un entero mayor que cero.");
  }
}

export function reserveStock(stock: StockLevels, quantity: number): StockLevels {
  assertPositiveInteger(quantity);
  if (stock.availableStock < quantity) {
    throw new InsufficientStockError(quantity, stock.availableStock);
  }
  return {
    ...stock,
    availableStock: stock.availableStock - quantity,
    reservedStock: stock.reservedStock + quantity,
  };
}

export function releaseStock(stock: StockLevels, quantity: number): StockLevels {
  assertPositiveInteger(quantity);
  if (stock.reservedStock < quantity) {
    throw new RangeError("No se puede liberar más de lo reservado.");
  }
  return {
    ...stock,
    reservedStock: stock.reservedStock - quantity,
    availableStock: stock.availableStock + quantity,
  };
}

export function commitStock(stock: StockLevels, quantity: number): StockLevels {
  assertPositiveInteger(quantity);
  if (stock.reservedStock < quantity) {
    throw new RangeError("No se puede confirmar más de lo reservado.");
  }
  return {
    ...stock,
    reservedStock: stock.reservedStock - quantity,
    soldStock: stock.soldStock + quantity,
  };
}
