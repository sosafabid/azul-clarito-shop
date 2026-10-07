/**
 * Impuestos (reglas puras, sin base de datos).
 *
 * Importes: ENTEROS en la unidad mínima de la moneda (colones, centavos). La tasa se guarda en
 * PUNTOS BÁSICOS (1 % = 100 bps; 13 % = 1300) para no usar decimales flotantes.
 *
 * Esta primera versión admite UNA tasa activa a la vez. NO existe ninguna tasa por defecto: la
 * tasa oficial la define quien administra la tienda, en el panel.
 */
export const TAX_ROUNDING_MODES = ["HALF_UP", "FLOOR", "CEIL"] as const;
export type TaxRounding = (typeof TAX_ROUNDING_MODES)[number];
export const TAX_ROUNDING_LABELS: Record<TaxRounding, string> = {
  HALF_UP: "Al más cercano (0,5 sube)",
  FLOOR: "Hacia abajo",
  CEIL: "Hacia arriba",
};

export const TAX_RULE_SCOPES = ["ALL", "CATEGORY", "PRODUCT"] as const;
export type TaxRuleScope = (typeof TAX_RULE_SCOPES)[number];
export const TAX_TREATMENTS = ["TAXABLE", "EXEMPT"] as const;
export type TaxTreatment = (typeof TAX_TREATMENTS)[number];
export const TAX_TREATMENT_LABELS: Record<TaxTreatment, string> = { TAXABLE: "Sujeto al impuesto", EXEMPT: "Exento / no sujeto" };

export const MAX_RATE_BPS = 10_000;

/** Redondea `numerator / denominator` (enteros no negativos) según el modo. */
export function divideRounded(numerator: number, denominator: number, mode: TaxRounding): number {
  if (denominator <= 0) throw new Error("denominator must be positive");
  const quotient = Math.floor(numerator / denominator);
  const remainder = numerator - quotient * denominator;
  if (remainder === 0) return quotient;
  if (mode === "FLOOR") return quotient;
  if (mode === "CEIL") return quotient + 1;
  return remainder * 2 >= denominator ? quotient + 1 : quotient;
}

/**
 * Impuesto de UNA línea.
 *  - Precio SIN impuesto (el impuesto se suma): impuesto = base × tasa.
 *  - Precio CON impuesto incluido: impuesto = precio − neto, con neto = precio ÷ (1 + tasa).
 * Se redondea por línea (como en una factura).
 */
export function lineTax(lineAmount: number, rateBps: number, included: boolean, rounding: TaxRounding): number {
  if (lineAmount <= 0 || rateBps <= 0) return 0;
  if (!included) return divideRounded(lineAmount * rateBps, 10_000, rounding);
  const net = divideRounded(lineAmount * 10_000, 10_000 + rateBps, rounding === "FLOOR" ? "CEIL" : rounding === "CEIL" ? "FLOOR" : "HALF_UP");
  return lineAmount - net;
}

export type TaxRuleInput = { scope: TaxRuleScope; categoryId: string | null; productId: string | null; treatment: TaxTreatment };

/**
 * ¿Está sujeto un producto? Gana la regla MÁS ESPECÍFICA: producto > categoría > todos.
 * Sin ninguna regla aplicable, NO se cobra impuesto (hay que declarar qué está sujeto).
 */
export function isTaxable(product: { productId: string; categoryId: string | null }, rules: readonly TaxRuleInput[]): boolean {
  const byProduct = rules.find((r) => r.scope === "PRODUCT" && r.productId === product.productId);
  if (byProduct) return byProduct.treatment === "TAXABLE";
  const byCategory = product.categoryId ? rules.find((r) => r.scope === "CATEGORY" && r.categoryId === product.categoryId) : undefined;
  if (byCategory) return byCategory.treatment === "TAXABLE";
  const all = rules.find((r) => r.scope === "ALL");
  return all?.treatment === "TAXABLE";
}

/** Porcentaje escrito por una persona ("13", "13,5", "13.50") → puntos básicos. */
export function parsePercentToBps(raw: string): { ok: true; bps: number } | { ok: false; error: string } {
  const text = raw.trim().replace(",", ".").replace("%", "").trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) return { ok: false, error: "Escribí un porcentaje válido (ej. 13 o 13,5), con hasta 2 decimales." };
  const bps = Math.round(Number(text) * 100);
  if (bps > MAX_RATE_BPS) return { ok: false, error: "El porcentaje no puede pasar de 100." };
  return { ok: true, bps };
}

export const formatBps = (bps: number) => `${(bps / 100).toLocaleString("es-CR", { maximumFractionDigits: 2 })} %`;
