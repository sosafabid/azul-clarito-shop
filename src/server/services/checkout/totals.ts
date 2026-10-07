import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { Database } from "@/db/client";
import { products, shippingMethods, shippingRates, taxRates, taxRules } from "@/db/schema";
import { computeTotals, type CheckoutTotals, type MethodInput, type TaxConfig } from "@/domain/checkout";
import type { Destination } from "@/domain/shipping";
import { getCartView } from "@/server/services/cart/cart";
import type { CartOwner, CartView } from "@/server/services/cart/types";

/**
 * TOTALES DEL CHECKOUT, calculados en el SERVIDOR con datos de PostgreSQL.
 *
 * Recibe SOLO quién es la dueña del carrito, el destino y el método de envío elegido. Nunca un precio,
 * impuesto, costo de envío ni total: todo eso se vuelve a leer aquí (producto activo, variante válida, precio
 * actual, stock, tasa vigente, tarifa vigente). Más adelante, la creación de la orden pendiente y el pago
 * llamarán a esta MISMA función y usarán `totals.snapshot` y `totals.total` tal cual.
 */
export async function loadTaxConfig(db: Database): Promise<TaxConfig> {
  const [rate] = await db.select().from(taxRates).where(eq(taxRates.isActive, true)).limit(1);
  if (!rate) return null;
  const rules = await db
    .select({ scope: taxRules.scope, categoryId: taxRules.categoryId, productId: taxRules.productId, treatment: taxRules.treatment })
    .from(taxRules)
    .where(eq(taxRules.taxRateId, rate.id));
  return { code: rate.code, name: rate.name, rateBps: rate.rateBps, included: rate.pricesIncludeTax, rounding: rate.rounding, rules };
}

/** Métodos ACTIVOS con sus tarifas ACTIVAS (lo que el cliente puede elegir). */
export async function loadShippingMethods(db: Database): Promise<MethodInput[]> {
  const methods = await db.select().from(shippingMethods).where(eq(shippingMethods.isActive, true)).orderBy(asc(shippingMethods.sortOrder), asc(shippingMethods.name));
  if (methods.length === 0) return [];
  const rates = await db
    .select()
    .from(shippingRates)
    .where(and(eq(shippingRates.isActive, true), inArray(shippingRates.methodId, methods.map((m) => m.id))));
  return methods.map((method) => ({
    id: method.id,
    code: method.code,
    name: method.name,
    description: method.description,
    type: method.type,
    sortOrder: method.sortOrder,
    estimatedDaysMin: method.estimatedDaysMin,
    estimatedDaysMax: method.estimatedDaysMax,
    rates: rates
      .filter((rate) => rate.methodId === method.id)
      .map((rate) => ({
        id: rate.id,
        methodId: rate.methodId,
        countryCode: rate.countryCode,
        stateProvince: rate.stateProvince,
        city: rate.city,
        postalCode: rate.postalCode,
        price: rate.price,
        currency: rate.currency,
        minOrderAmount: rate.minOrderAmount,
        maxOrderAmount: rate.maxOrderAmount,
        freeShippingThreshold: rate.freeShippingThreshold,
      })),
  }));
}

const EMPTY_CART: CartView = { lines: [], currency: null, subtotal: 0, totalUnits: 0, hasIssues: false };

export async function calculateCheckoutTotals(
  db: Database,
  input: { owner: CartOwner | null; destination: Destination | null; shippingMethodId: string | null; now?: Date },
): Promise<{ totals: CheckoutTotals; cart: CartView }> {
  // 1) El carrito se revalida contra la base: producto activo, variante válida, precio actual y stock.
  const cart = input.owner ? await getCartView(db, input.owner) : EMPTY_CART;

  // 2) Categoría de cada producto (para las reglas de impuesto).
  const productIds = [...new Set(cart.lines.map((line) => line.productId))];
  const categoryRows = productIds.length > 0 ? await db.select({ id: products.id, categoryId: products.categoryId }).from(products).where(inArray(products.id, productIds)) : [];
  const categoryOf = new Map(categoryRows.map((row) => [row.id, row.categoryId]));

  // 3) Impuesto y envíos vigentes ahora mismo.
  const [tax, methods] = await Promise.all([loadTaxConfig(db), loadShippingMethods(db)]);

  const totals = computeTotals({
    currency: cart.currency ?? "CRC",
    lines: cart.lines.map((line) => ({
      lineId: line.id,
      productId: line.productId,
      variantId: line.variantId,
      categoryId: categoryOf.get(line.productId) ?? null,
      sku: line.sku,
      name: line.variantLabel ? `${line.name} (${line.variantLabel})` : line.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      status: line.status,
    })),
    tax,
    destination: input.destination,
    methods,
    selectedMethodId: input.shippingMethodId,
    now: input.now,
  });
  return { totals, cart };
}
