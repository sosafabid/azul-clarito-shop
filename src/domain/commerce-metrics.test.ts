import { describe, expect, it } from "vitest";
import { METRIC_DEFINITIONS, funnelRates, summarizeOrders, type PaidOrderRow } from "./commerce-metrics";

const order = (n: string, subtotal: number, country = "CR", items: PaidOrderRow["items"] = [{ productKey: "p1", name: "Gorra", quantity: 1, lineTotal: subtotal }], currency = "CRC"): PaidOrderRow => ({
  orderNumber: n, paidAt: new Date("2026-11-20T15:00:00Z"), currency, subtotal, taxTotal: Math.round(subtotal * 0.13), shippingTotal: 2000, total: subtotal + Math.round(subtotal * 0.13) + 2000, country, items,
});

describe("resumen de ventas", () => {
  it("sin pedidos todo es cero (no hay datos inventados)", () => {
    const s = summarizeOrders([]);
    expect(s).toMatchObject({ orders: 0, revenue: 0, averageOrderValue: 0, units: 0, topProducts: [] });
  });
  it("suma ingresos de productos, ticket promedio, unidades y rendimiento por producto y país", () => {
    const s = summarizeOrders([order("A", 10000), order("B", 20000, "PA", [{ productKey: "p1", name: "Gorra", quantity: 2, lineTotal: 12000 }, { productKey: "p2", name: "Tote", quantity: 1, lineTotal: 8000 }])]);
    expect(s.orders).toBe(2);
    expect(s.revenue).toBe(30000);
    expect(s.averageOrderValue).toBe(15000);
    expect(s.units).toBe(4);
    expect(s.topProducts[0]).toMatchObject({ productKey: "p1", units: 3, revenue: 22000 });
    expect(s.byCountry.map((c) => c.country)).toEqual(["PA", "CR"]);
  });
  it("no mezcla monedas", () => {
    const s = summarizeOrders([order("A", 10000), order("B", 500, "US", [], "USD")]);
    expect(s.orders).toBe(1);
    expect(s.otherCurrencyOrders).toBe(1);
  });
});

describe("embudo", () => {
  it("calcula tasas con cifras de GA4 y pedidos reales; sin denominador no inventa", () => {
    expect(funnelRates({ visitors: 1000, productViewers: 400, addToCartUsers: 80, checkoutStarts: 40 }, 10)).toEqual({ addToCartRate: 0.2, checkoutRate: 0.5, purchaseConversion: 0.01 });
    expect(funnelRates({ visitors: 0, productViewers: 0, addToCartUsers: 0, checkoutStarts: 0 }, 0)).toEqual({ addToCartRate: null, checkoutRate: null, purchaseConversion: null });
  });
  it("define las nueve métricas pedidas, cada una con su fuente", () => {
    expect(METRIC_DEFINITIONS.map((m) => m.id)).toEqual(["visitors", "product_views", "add_to_cart_rate", "checkout_starts", "purchase_conversion", "revenue", "average_order_value", "product_performance", "traffic_source"]);
  });
});
