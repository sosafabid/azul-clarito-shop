import type { ProductStatus } from "./catalog";
import type { CatalogCapabilities } from "./capabilities";
import { unitEconomics } from "./product-economics";
import type { ParsedProduct } from "./product-form";
import type { ParsedVariant } from "./variant-form";

/**
 * LÍMITES DE QUIEN EDITA EL CATÁLOGO (se aplican en el SERVIDOR, después de validar el formulario).
 *
 * Una persona de STAFF puede crear y editar productos, pero NO ve ni cambia costos, NO registra
 * stock ni ajustes, y NO publica. Aunque alguien fabrique la petición a mano (agregando un campo
 * `cost`, `availableStock` o `status`), estas funciones descartan lo que no le corresponde y
 * conservan el valor guardado. Funciones puras: se prueban sin base de datos.
 */
export type StoredEconomics = { cost: number | null; availableStock: number };

export function constrainProductInput(input: ParsedProduct, caps: CatalogCapabilities, stored?: StoredEconomics): ParsedProduct {
  const next = { ...input };
  if (!caps.costs) next.cost = stored?.cost ?? null;
  if (!caps.stock) next.availableStock = stored?.availableStock ?? 0;
  if (!caps.publish) next.status = "DRAFT" satisfies ProductStatus;
  return next;
}

export function constrainVariantInput(input: ParsedVariant, caps: CatalogCapabilities, stored?: StoredEconomics): ParsedVariant {
  const next = { ...input };
  if (!caps.costs) next.cost = stored?.cost ?? null;
  if (!caps.stock) next.availableStock = stored?.availableStock ?? 0;
  return next;
}

/**
 * Quien no ve costos no puede confirmar una venta con pérdida (no sabe contra qué se compara).
 * Devuelve `true` si el precio quedaría por debajo del costo GUARDADO; el mensaje no revela el costo.
 */
export function priceBelowStoredCost(price: number, storedCost: number | null): boolean {
  return unitEconomics(price, storedCost).isLoss;
}

export const BELOW_COST_MESSAGE_FOR_STAFF = "Ese precio no se puede guardar. Pedile a una persona SUPER_ADMIN que lo revise.";
