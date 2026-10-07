import { resolveRate, type Destination, type RateCandidate, type ShippingType } from "./shipping";
import { isTaxable, lineTax, type TaxRounding, type TaxRuleInput } from "./tax";

/**
 * MOTOR DE TOTALES DEL CHECKOUT (puro: sin base de datos, cookies ni red).
 *
 * subtotal   = Σ precio × cantidad de las líneas comprables (precios leídos de la base por el servidor)
 * impuesto   = por línea sujeta, según la tasa activa (se SUMA al total, o ya viene INCLUIDO en el precio)
 * envío      = tarifa más específica del destino para el método elegido (0 si llega al umbral de envío gratis)
 * total      = subtotal + impuesto + envío            (con impuesto incluido: subtotal + envío)
 *
 * Esta función NO recibe ningún total, impuesto ni costo de envío del navegador: todo se deriva de
 * precios, tasas y tarifas que el servidor leyó de PostgreSQL. Ver `server/services/checkout/totals.ts`.
 */
export type TaxConfig = {
  code: string;
  name: string;
  rateBps: number;
  /** true = los precios publicados ya incluyen el impuesto. */
  included: boolean;
  rounding: TaxRounding;
  rules: readonly TaxRuleInput[];
} | null;

export type TotalsLineInput = {
  lineId: string;
  productId: string;
  variantId: string | null;
  categoryId: string | null;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  status: "ok" | "insufficient" | "unavailable";
};

export type MethodInput = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: ShippingType;
  sortOrder: number;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  rates: readonly RateCandidate[];
};

export type ShippingOption = {
  methodId: string;
  code: string;
  name: string;
  description: string | null;
  type: ShippingType;
  rateId: string;
  amount: number;
  free: boolean;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
};

export type CheckoutBlocker = { code: "empty_cart" | "line_unavailable" | "line_insufficient"; message: string; lineId?: string };

/** needs_destination → falta la dirección · unavailable → no hay envío a ese destino · needs_method → falta elegir · selected → listo. */
export type ShippingState = "needs_destination" | "unavailable" | "needs_method" | "selected";

export type PricingSnapshot = {
  version: 1;
  currency: string;
  subtotal: number;
  items: { productId: string; variantId: string | null; sku: string; name: string; quantity: number; unitPrice: number; lineTotal: number; taxable: boolean; taxAmount: number }[];
  tax: { applied: boolean; code: string | null; name: string | null; rateBps: number | null; included: boolean; rounding: TaxRounding | null; amount: number };
  shipping: { methodId: string; code: string; name: string; type: ShippingType; rateId: string; amount: number; freeApplied: boolean; destination: Destination };
  total: number;
  computedAt: string;
};

export type CheckoutTotals = {
  currency: string;
  lines: { lineId: string; quantity: number; unitPrice: number; lineTotal: number; taxable: boolean; taxAmount: number }[];
  subtotal: number;
  tax: { applied: boolean; name: string | null; rateBps: number | null; amount: number; included: boolean };
  shipping: { state: ShippingState; options: ShippingOption[]; selected: ShippingOption | null; amount: number | null; selectionInvalid: boolean };
  /** Subtotal + impuesto (si no estaba incluido), SIN envío: lo que ya se sabe aunque falte elegir el envío. */
  totalBeforeShipping: number;
  /** `null` mientras falte elegir un envío válido o haya líneas que atender. Nunca es un valor inventado. */
  total: number | null;
  blockers: CheckoutBlocker[];
  canProceed: boolean;
  /** Listo para guardarse en la orden (solo cuando `total` existe). */
  snapshot: PricingSnapshot | null;
};

export function computeTotals(input: {
  currency: string;
  lines: readonly TotalsLineInput[];
  tax: TaxConfig;
  destination: Destination | null;
  methods: readonly MethodInput[];
  selectedMethodId: string | null;
  now?: Date;
}): CheckoutTotals {
  const { currency, tax, destination } = input;

  const blockers: CheckoutBlocker[] = [];
  if (input.lines.length === 0) blockers.push({ code: "empty_cart", message: "Tu carrito está vacío." });
  for (const line of input.lines) {
    if (line.status === "unavailable") blockers.push({ code: "line_unavailable", lineId: line.lineId, message: `${line.name} ya no está disponible.` });
    if (line.status === "insufficient") blockers.push({ code: "line_insufficient", lineId: line.lineId, message: `No hay stock suficiente de ${line.name}.` });
  }

  // Solo cuentan las líneas que se pueden comprar tal cual (igual que el subtotal del carrito).
  const priced = input.lines
    .filter((line) => line.status === "ok")
    .map((line) => {
      const lineTotal = line.unitPrice * line.quantity;
      const taxable = tax !== null && isTaxable({ productId: line.productId, categoryId: line.categoryId }, tax.rules);
      const taxAmount = tax !== null && taxable ? lineTax(lineTotal, tax.rateBps, tax.included, tax.rounding) : 0;
      return { line, lineTotal, taxable, taxAmount };
    });

  const subtotal = priced.reduce((sum, p) => sum + p.lineTotal, 0);
  const taxAmount = priced.reduce((sum, p) => sum + p.taxAmount, 0);
  const included = tax?.included ?? false;
  const totalBeforeShipping = subtotal + (included ? 0 : taxAmount);

  // ── Envío ──
  let options: ShippingOption[] = [];
  if (destination) {
    options = [...input.methods]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .flatMap((method) => {
        const resolved = resolveRate(method.rates, destination, subtotal, currency);
        return resolved
          ? [{ methodId: method.id, code: method.code, name: method.name, description: method.description, type: method.type, rateId: resolved.rate.id, amount: resolved.amount, free: resolved.free, estimatedDaysMin: method.estimatedDaysMin, estimatedDaysMax: method.estimatedDaysMax }]
          : [];
      });
  }
  const selected = options.find((option) => option.methodId === input.selectedMethodId) ?? null;
  const state: ShippingState = !destination ? "needs_destination" : options.length === 0 ? "unavailable" : selected ? "selected" : "needs_method";
  const selectionInvalid = input.selectedMethodId !== null && destination !== null && selected === null;

  const shippingAmount = selected ? selected.amount : null;
  const total = blockers.length === 0 && shippingAmount !== null ? totalBeforeShipping + shippingAmount : null;

  const snapshot: PricingSnapshot | null =
    total !== null && selected && destination
      ? {
          version: 1,
          currency,
          subtotal,
          items: priced.map((p) => ({ productId: p.line.productId, variantId: p.line.variantId, sku: p.line.sku, name: p.line.name, quantity: p.line.quantity, unitPrice: p.line.unitPrice, lineTotal: p.lineTotal, taxable: p.taxable, taxAmount: p.taxAmount })),
          tax: { applied: tax !== null, code: tax?.code ?? null, name: tax?.name ?? null, rateBps: tax?.rateBps ?? null, included, rounding: tax?.rounding ?? null, amount: taxAmount },
          shipping: { methodId: selected.methodId, code: selected.code, name: selected.name, type: selected.type, rateId: selected.rateId, amount: selected.amount, freeApplied: selected.free, destination },
          total,
          computedAt: (input.now ?? new Date()).toISOString(),
        }
      : null;

  return {
    currency,
    lines: priced.map((p) => ({ lineId: p.line.lineId, quantity: p.line.quantity, unitPrice: p.line.unitPrice, lineTotal: p.lineTotal, taxable: p.taxable, taxAmount: p.taxAmount })),
    subtotal,
    tax: { applied: tax !== null, name: tax?.name ?? null, rateBps: tax?.rateBps ?? null, amount: taxAmount, included },
    shipping: { state, options, selected, amount: shippingAmount, selectionInvalid },
    totalBeforeShipping,
    total,
    blockers,
    canProceed: blockers.length === 0 && total !== null,
    snapshot,
  };
}

/**
 * Cómo se guardan estos montos en las columnas de `orders` (que exigen total = subtotal + envío + impuesto).
 * Con impuesto INCLUIDO en el precio, `subtotal` se guarda NETO (sin impuesto) y el impuesto aparte, de modo
 * que la suma siga dando el total que pagó la clienta.
 */
export function toOrderAmounts(snapshot: PricingSnapshot): { subtotal: number; taxTotal: number; shippingTotal: number; total: number } {
  const taxTotal = snapshot.tax.amount;
  const subtotal = snapshot.tax.included ? snapshot.subtotal - taxTotal : snapshot.subtotal;
  return { subtotal, taxTotal, shippingTotal: snapshot.shipping.amount, total: snapshot.total };
}
