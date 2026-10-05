/**
 * Dinero.
 *
 * Todos los montos se guardan como ENTEROS en la unidad mínima "de uso" de la
 * moneda (nunca como decimales/float):
 *   - CRC: colones enteros  → 12000  = ₡12.000   (en la práctica no se usan céntimos)
 *   - USD: centavos         → 1250   = $12,50
 *
 * Si un proveedor de pagos espera otra unidad (p. ej. céntimos de colón), la
 * conversión se hace dentro de su adaptador, no aquí.
 */
export const SUPPORTED_CURRENCIES = ["CRC", "USD"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = "CRC";

const CURRENCY_META: Record<CurrencyCode, { symbol: string; decimals: number }> = {
  CRC: { symbol: "₡", decimals: 0 },
  USD: { symbol: "$", decimals: 2 },
};

export function isSupportedCurrency(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/** Convierte un monto entero (unidad mínima) a número "humano": 1250 USD → 12.5 */
export function fromMinorUnits(amount: number, currency: CurrencyCode): number {
  return amount / 10 ** CURRENCY_META[currency].decimals;
}

/** Convierte lo que se escribe en un formulario (12.5) a entero guardable (1250). */
export function toMinorUnits(amount: number, currency: CurrencyCode): number {
  return Math.round(amount * 10 ** CURRENCY_META[currency].decimals);
}

/**
 * Formato con la convención de Azul Clarito: punto para miles y coma para
 * decimales (₡12.000 · $1.234,50). Se hace a mano a propósito: `Intl` con
 * es-CR usa espacio como separador de miles, que no coincide con el sitio.
 */
export function formatMoney(amount: number, currency: CurrencyCode = DEFAULT_CURRENCY): string {
  const { symbol, decimals } = CURRENCY_META[currency];
  const negative = amount < 0;
  const value = Math.abs(fromMinorUnits(amount, currency));
  const [integerPart, decimalPart] = value.toFixed(decimals).split(".");
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const body = decimals > 0 ? `${grouped},${decimalPart}` : grouped;
  return `${negative ? "-" : ""}${symbol}${body}`;
}
