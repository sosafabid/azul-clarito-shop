/**
 * Quita de los datos del panel todo lo que sea económico-interno cuando quien mira no tiene
 * el permiso `costs:read`. Se aplica EN EL SERVIDOR antes de entregar datos a la página o a
 * los componentes (lo que llega a un componente de cliente viaja al navegador).
 *
 * Funciones puras: ponen en `null` los campos de costo conocidos (también dentro de objetos
 * anidados como `stock` o `inventory`) y conservan el resto.
 */
export const COST_FIELDS = ["cost", "valueAtCost", "potentialProfit", "productCost", "variantCost", "inventoryValueAtCost", "unitCost"] as const;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);

export function stripCosts<T extends object>(value: T): T {
  const copy = { ...value } as Record<string, unknown>;
  for (const key of Object.keys(copy)) {
    if ((COST_FIELDS as readonly string[]).includes(key)) copy[key] = null;
    else if (key === "rowsWithoutCost") copy[key] = 0;
    else if (isPlainObject(copy[key])) copy[key] = stripCosts(copy[key]);
  }
  return copy as T;
}

export function redactCosts<T extends object>(rows: readonly T[], allowed: boolean): T[] {
  return allowed ? [...rows] : rows.map(stripCosts);
}
