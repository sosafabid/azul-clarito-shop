/**
 * Qué cambios económicos de un producto se registran en `audit_logs`.
 * Función pura: compara el antes y el después y devuelve la lista de cambios.
 */
export type ProductEconomicFields = {
  price: number;
  cost: number | null;
  currency: string;
  availableStock: number;
};

export type AuditedField = keyof ProductEconomicFields;

export type ProductAuditChange = {
  field: AuditedField;
  /** Valor para `audit_logs.action`. */
  action: string;
  from: number | string | null;
  to: number | string | null;
};

const ACTIONS: Record<AuditedField, string> = {
  price: "product.price_changed",
  cost: "product.cost_changed",
  currency: "product.currency_changed",
  availableStock: "product.stock_changed",
};

const FIELDS: readonly AuditedField[] = ["price", "cost", "currency", "availableStock"];

export function diffProductEconomics(
  before: ProductEconomicFields,
  after: ProductEconomicFields,
): ProductAuditChange[] {
  const changes: ProductAuditChange[] = [];
  for (const field of FIELDS) {
    if (before[field] !== after[field]) {
      changes.push({ field, action: ACTIONS[field], from: before[field], to: after[field] });
    }
  }
  return changes;
}

/** Campos editables de un producto (para el registro de auditoría "product.updated"). */
export type ProductEditableFields = {
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  categoryId: string | null;
  collectionId: string | null;
  isFeatured: boolean;
  isNew: boolean;
  isLimitedEdition: boolean;
  price: number;
  cost: number | null;
  currency: string;
  lowStockThreshold: number;
  availableStock: number;
};

/** Nombres de los campos que cambiaron entre el antes y el después. */
export function changedProductFields(before: ProductEditableFields, after: ProductEditableFields): (keyof ProductEditableFields)[] {
  return (Object.keys(before) as (keyof ProductEditableFields)[]).filter((key) => before[key] !== after[key]);
}
