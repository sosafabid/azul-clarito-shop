import { SKU_PATTERN } from "./product-form-shared";
import { parseMoneyInput, type CurrencyCode } from "./money";

export type VariantFormInput = Partial<Record<string, string>>;

export type ParsedVariant = {
  name: string;
  sku: string;
  options: Record<string, string>;
  /** Precio propio; `null` = usa el del producto. */
  price: number | null;
  /** Costo propio; `null` = usa el del producto. */
  cost: number | null;
  availableStock: number;
  isActive: boolean;
};

export type VariantFormResult = { ok: true; data: ParsedVariant } | { ok: false; errors: Record<string, string> };

const MAX_OPTIONS = 6;
const MAX_TEXT = 40;

/** "Talla: M" / "Color = Azul" (una por línea) → { Talla: "M", Color: "Azul" } */
export function parseOptions(text: string): { options: Record<string, string>; error?: string } {
  const options: Record<string, string> = {};
  for (const line of text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    const match = /^([^:=]+)[:=](.+)$/.exec(line);
    if (!match) return { options, error: `“${line.slice(0, 40)}”: usá el formato Clave: valor (ej. Talla: M).` };
    const key = match[1].trim();
    const value = match[2].trim();
    if (!key || !value || key.length > MAX_TEXT || value.length > MAX_TEXT) {
      return { options, error: `Cada opción admite hasta ${MAX_TEXT} caracteres en clave y valor.` };
    }
    options[key] = value;
  }
  if (Object.keys(options).length > MAX_OPTIONS) return { options, error: `Máximo ${MAX_OPTIONS} opciones por variante.` };
  return { options };
}

export function parseVariantForm(input: VariantFormInput, currency: CurrencyCode): VariantFormResult {
  const errors: Record<string, string> = {};
  const value = (key: string) => (input[key] ?? "").trim();

  const parsedOptions = parseOptions(input.options ?? "");
  if (parsedOptions.error) errors.options = parsedOptions.error;

  const name = value("name") || Object.values(parsedOptions.options).join(" / ");
  if (name.length < 1 || name.length > 80) errors.name = "Poné un nombre (o al menos una opción, ej. Talla: M).";

  const sku = value("sku");
  if (sku.length < 2 || sku.length > 60 || !SKU_PATTERN.test(sku)) {
    errors.sku = "El SKU debe tener 2 a 60 caracteres: letras, números, punto, guion o guion bajo.";
  }

  let price: number | null = null;
  if (value("price") !== "") {
    const parsed = parseMoneyInput(value("price"), currency);
    if (parsed.ok) price = parsed.amount;
    else errors.price = `Precio: ${parsed.error}`;
  }
  let cost: number | null = null;
  if (value("cost") !== "") {
    const parsed = parseMoneyInput(value("cost"), currency);
    if (parsed.ok) cost = parsed.amount;
    else errors.cost = `Costo: ${parsed.error}`;
  }

  const stockRaw = value("availableStock") || "0";
  const availableStock = /^\d+$/.test(stockRaw) && Number(stockRaw) <= 1_000_000 ? Number(stockRaw) : 0;
  if (!/^\d+$/.test(stockRaw) || Number(stockRaw) > 1_000_000) errors.availableStock = "Stock: un entero entre 0 y 1.000.000.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: { name, sku, options: parsedOptions.options, price, cost, availableStock, isActive: input.isActive === "on" },
  };
}
