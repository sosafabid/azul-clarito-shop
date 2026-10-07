import { isUuid } from "./ids";
import { parseMoneyInput } from "./money";
import { SHIPPING_TYPES, STORE_COUNTRY, type ShippingType } from "./shipping";
import { slugify } from "./slug";
import { TAX_ROUNDING_MODES, TAX_RULE_SCOPES, TAX_TREATMENTS, parsePercentToBps, type TaxRounding, type TaxRuleScope, type TaxTreatment } from "./tax";

/** Validación de los formularios de Impuestos y Envíos del panel (reglas puras). */
type Input = Partial<Record<string, string>>;
export type FormResult<T> = { ok: true; data: T } | { ok: false; errors: Record<string, string> };
const text = (input: Input, key: string) => (input[key] ?? "").trim();
const done = <T>(errors: Record<string, string>, data: () => T): FormResult<T> => (Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, data: data() });

// ── Impuesto ──
export type ParsedTaxRate = { name: string; rateBps: number; included: boolean; rounding: TaxRounding; active: boolean };

export function parseTaxRateForm(input: Input): FormResult<ParsedTaxRate> {
  const errors: Record<string, string> = {};
  const name = text(input, "name");
  if (name.length < 2 || name.length > 60) errors.name = "El nombre debe tener entre 2 y 60 caracteres.";
  const rate = parsePercentToBps(text(input, "rate"));
  if (!rate.ok) errors.rate = rate.error;
  // Sin valor por defecto: hay que DECIDIR si el precio publicado ya incluye el impuesto.
  const included = text(input, "included");
  if (included !== "yes" && included !== "no") errors.included = "Indicá si los precios publicados ya incluyen el impuesto.";
  const rounding = text(input, "rounding") as TaxRounding;
  if (!(TAX_ROUNDING_MODES as readonly string[]).includes(rounding)) errors.rounding = "Elegí un tipo de redondeo.";
  return done(errors, () => ({ name, rateBps: rate.ok ? rate.bps : 0, included: included === "yes", rounding, active: input.active === "on" }));
}

export type ParsedTaxRule = { scope: TaxRuleScope; categoryId: string | null; sku: string | null; treatment: TaxTreatment };

export function parseTaxRuleForm(input: Input): FormResult<ParsedTaxRule> {
  const errors: Record<string, string> = {};
  const scope = text(input, "scope") as TaxRuleScope;
  if (!(TAX_RULE_SCOPES as readonly string[]).includes(scope)) errors.scope = "Elegí a qué aplica la regla.";
  const treatment = text(input, "treatment") as TaxTreatment;
  if (!(TAX_TREATMENTS as readonly string[]).includes(treatment)) errors.treatment = "Elegí si está sujeto o exento.";
  const categoryId = text(input, "categoryId");
  const sku = text(input, "sku");
  if (scope === "CATEGORY" && !isUuid(categoryId)) errors.categoryId = "Elegí una categoría.";
  if (scope === "PRODUCT" && (sku === "" || sku.length > 60)) errors.sku = "Escribí el SKU del producto.";
  return done(errors, () => ({ scope, treatment, categoryId: scope === "CATEGORY" ? categoryId : null, sku: scope === "PRODUCT" ? sku : null }));
}

// ── Envío ──
export type ParsedShippingMethod = {
  name: string;
  code: string;
  description: string | null;
  type: ShippingType;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  sortOrder: number;
  active: boolean;
};

const optionalInt = (raw: string, min: number, max: number): number | null | "invalid" => {
  if (raw === "") return null;
  if (!/^-?\d+$/.test(raw)) return "invalid";
  const value = Number(raw);
  return value < min || value > max ? "invalid" : value;
};

export function parseShippingMethodForm(input: Input): FormResult<ParsedShippingMethod> {
  const errors: Record<string, string> = {};
  const name = text(input, "name");
  if (name.length < 2 || name.length > 60) errors.name = "El nombre debe tener entre 2 y 60 caracteres.";
  const code = text(input, "code") || slugify(name);
  if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(code)) errors.code = "El código admite minúsculas, números y guiones (2 a 40).";
  const type = text(input, "type") as ShippingType;
  if (!(SHIPPING_TYPES as readonly string[]).includes(type)) errors.type = "Elegí el tipo de envío.";
  const description = text(input, "description");
  if (description.length > 300) errors.description = "La descripción admite hasta 300 caracteres.";
  const min = optionalInt(text(input, "daysMin"), 0, 365);
  const max = optionalInt(text(input, "daysMax"), 0, 365);
  if (min === "invalid") errors.daysMin = "Días: un entero entre 0 y 365.";
  if (max === "invalid") errors.daysMax = "Días: un entero entre 0 y 365.";
  if (typeof min === "number" && typeof max === "number" && min > max) errors.daysMax = "El máximo no puede ser menor que el mínimo.";
  const sort = optionalInt(text(input, "sortOrder") || "0", -100, 1000);
  if (sort === "invalid" || sort === null) errors.sortOrder = "Prioridad: un entero entre -100 y 1000 (menor = primero).";
  return done(errors, () => ({
    name, code, description: description || null, type,
    estimatedDaysMin: typeof min === "number" ? min : null, estimatedDaysMax: typeof max === "number" ? max : null,
    sortOrder: typeof sort === "number" ? sort : 0, active: input.active === "on",
  }));
}

export type ParsedShippingRate = {
  /** Siempre Costa Rica por ahora (el formulario ya no ofrece otros países). */
  countryCode: string;
  /** Nombre interno de la zona (p. ej. GAM, Limón, Resto del país). Solo para el panel. */
  zoneName: string | null;
  stateProvince: string | null;
  city: string | null;
  postalCode: string | null;
  price: number;
  minOrderAmount: number | null;
  maxOrderAmount: number | null;
  freeShippingThreshold: number | null;
  active: boolean;
};

export function parseShippingRateForm(input: Input): FormResult<ParsedShippingRate> {
  const errors: Record<string, string> = {};
  // Zonas: se puede escribir una lista separada por ";" (p. ej. varios cantones). `max` es el largo total del texto.
  const zone = (key: string, max: number) => text(input, key).replace(/\s+/g, " ").slice(0, max) || null;
  const zoneName = zone("zoneName", 60);
  // Los importes están en la moneda base de la tienda (colones): no hay conversión de moneda.
  const money = (key: string, required: boolean, label: string): number | null => {
    const raw = text(input, key);
    if (raw === "") {
      if (required) errors[key] = `${label}: obligatorio.`;
      return null;
    }
    const parsed = parseMoneyInput(raw, "CRC");
    if (!parsed.ok) errors[key] = `${label}: ${parsed.error}`;
    return parsed.ok ? parsed.amount : null;
  };
  const price = money("price", true, "Precio");
  const min = money("minOrder", false, "Pedido mínimo");
  const max = money("maxOrder", false, "Pedido máximo");
  const free = money("freeThreshold", false, "Envío gratis desde");
  if (min !== null && max !== null && min > max) errors.maxOrder = "El pedido máximo no puede ser menor que el mínimo.";
  return done(errors, () => ({
    // El país NO viene del formulario: por ahora solo se envía dentro de Costa Rica.
    countryCode: STORE_COUNTRY, zoneName, stateProvince: zone("province", 300), city: zone("city", 400), postalCode: zone("postalCode", 100),
    price: price ?? 0, minOrderAmount: min, maxOrderAmount: max, freeShippingThreshold: free, active: input.active === "on",
  }));
}
