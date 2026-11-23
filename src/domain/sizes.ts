import { SKU_PATTERN } from "./product-form-shared";
import { parseMoneyInput, type CurrencyCode } from "./money";

/**
 * TALLAS (ropa). Una talla es una variante con la opción "Talla" (p. ej. { Talla: "M" }); el stock, el precio propio y el
 * SKU se manejan por variante, como siempre. Estas reglas puras sirven para ordenar las tallas (XS → XXL), reconocerlas
 * en la tienda y crear varias de una vez en el panel.
 */
export const SIZE_KEY = "Talla";
export const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
const LETTER_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "3XL", "4XL"];
const ONE_SIZE = ["UNICA", "UNICO", "UNITALLA", "UNIVERSAL", "U"];
export const MAX_SIZES_PER_BATCH = 20;
const MAX_STOCK = 1_000_000;

const fold = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();

/** ¿La clave de opción es "Talla"? (acepta Talla / talla / Tamaño / Size). */
export function isSizeKey(key: string): boolean {
  return ["talla", "tamano", "size"].includes(fold(key));
}

/** Normaliza el texto de una talla: "xl" → "XL", "m" → "M"; lo demás ("38", "Única") se respeta. */
export function normalizeSize(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return /^[a-z]{1,3}$/i.test(trimmed) || /^\dxl$/i.test(trimmed) ? trimmed.toUpperCase() : trimmed;
}

/** La talla de una variante SOLO si su única opción es la talla; con más opciones (color, etc.) devuelve `null`. */
export function sizeValueOf(options: Record<string, string> | null | undefined): string | null {
  const entries = Object.entries(options ?? {});
  if (entries.length !== 1 || !isSizeKey(entries[0][0])) return null;
  return normalizeSize(entries[0][1]) || null;
}

/** Posición de una talla para ordenarla: letras (XS…4XL), luego números (36, 38…), luego "Única", luego lo desconocido. */
export function sizeRank(value: string): number {
  const folded = fold(value).toUpperCase().replace(/\s+/g, "");
  const letterIndex = LETTER_ORDER.indexOf(folded);
  if (letterIndex !== -1) return letterIndex;
  if (/^\d+([.,]\d+)?$/.test(folded)) return 100 + Number(folded.replace(",", "."));
  if (ONE_SIZE.includes(folded)) return 10_000;
  return 20_000;
}

export function compareSizes(a: string, b: string): number {
  return sizeRank(a) - sizeRank(b) || a.localeCompare(b, "es");
}

/** SKU de una talla a partir del SKU base: "CAM-TORT" + "XL" → "CAM-TORT-XL". */
export function sizeSku(baseSku: string, size: string): string {
  const suffix = fold(size).toUpperCase().replace(/[^A-Z0-9]+/g, "");
  return `${baseSku.trim()}-${suffix || "X"}`;
}

export type SizeEntry = { size: string; stock: number };

/** "38:5, 40:3, Única:10" o "38, 40" (sin stock = 0) → tallas con su stock. */
export function parseExtraSizes(text: string): { entries: SizeEntry[]; error?: string } {
  const entries: SizeEntry[] = [];
  for (const part of text.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean)) {
    const [rawSize, rawStock = "0"] = part.split(":").map((p) => p.trim());
    const size = normalizeSize(rawSize ?? "");
    if (!size || size.length > 20) return { entries, error: `“${part.slice(0, 30)}”: la talla debe tener entre 1 y 20 caracteres.` };
    if (!/^\d+$/.test(rawStock) || Number(rawStock) > MAX_STOCK) return { entries, error: `“${part.slice(0, 30)}”: el stock debe ser un entero (formato Talla:stock, ej. 38:5).` };
    entries.push({ size, stock: Number(rawStock) });
  }
  return { entries };
}

export type ParsedSizes = { baseSku: string; price: number | null; cost: number | null; isActive: boolean; sizes: SizeEntry[] };
export type SizesFormResult = { ok: true; data: ParsedSizes } | { ok: false; errors: Record<string, string> };

/**
 * Formulario "Agregar tallas de una vez": una casilla + stock por cada talla estándar (campos `size_XS` / `stock_XS`…),
 * un campo para otras tallas y un SKU base. Las tallas repetidas se unen (gana la última).
 */
export function parseSizesForm(input: Partial<Record<string, string>>, currency: CurrencyCode): SizesFormResult {
  const errors: Record<string, string> = {};
  const value = (key: string) => (input[key] ?? "").trim();

  const baseSku = value("baseSku");
  if (baseSku.length < 2 || baseSku.length > 50 || !SKU_PATTERN.test(baseSku)) errors.baseSku = "El SKU base debe tener 2 a 50 caracteres: letras, números, punto, guion o guion bajo (ej. CAM-TORTUGA).";

  const bySize = new Map<string, SizeEntry>();
  for (const size of STANDARD_SIZES) {
    if (input[`size_${size}`] !== "on") continue;
    const raw = value(`stock_${size}`) || "0";
    if (!/^\d+$/.test(raw) || Number(raw) > MAX_STOCK) errors[`stock_${size}`] = "Stock: un entero entre 0 y 1.000.000.";
    else bySize.set(size, { size, stock: Number(raw) });
  }
  const extra = parseExtraSizes(input.extraSizes ?? "");
  if (extra.error) errors.extraSizes = extra.error;
  for (const entry of extra.entries) bySize.set(entry.size, entry);
  if (bySize.size === 0 && Object.keys(errors).length === 0) errors.sizes = "Elegí al menos una talla.";
  if (bySize.size > MAX_SIZES_PER_BATCH) errors.sizes = `Máximo ${MAX_SIZES_PER_BATCH} tallas a la vez.`;

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

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const sizes = [...bySize.values()].sort((a, b) => compareSizes(a.size, b.size));
  return { ok: true, data: { baseSku, price, cost, isActive: input.isActive === "on", sizes } };
}
