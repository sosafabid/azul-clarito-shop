/**
 * Base de REPORTES COMERCIALES (pura). Tres fuentes que no se mezclan:
 *  - GA4  → tráfico y comportamiento (visitantes, vistas de producto, carritos, inicios de compra, fuentes de tráfico).
 *  - Base de datos (pedidos) → ventas reales: pedidos pagados, ingresos, ticket promedio, rendimiento por producto.
 *  - Catálogo → productos activos e inventario.
 * La verdad de las VENTAS siempre es la base de datos; GA4 sirve para entender el camino hasta la venta.
 */

export type MetricSource = "ga4" | "database" | "catalog" | "derived";
export type MetricDefinition = { id: string; label: string; source: MetricSource; definition: string };

export const METRIC_DEFINITIONS: readonly MetricDefinition[] = [
  { id: "visitors", label: "Visitantes", source: "ga4", definition: "Usuarios activos en GA4 (informe Adquisición). Solo incluye a quienes aceptaron cookies de medición." },
  { id: "product_views", label: "Vistas de producto", source: "ga4", definition: "Evento view_item (usuarios que vieron al menos una ficha)." },
  { id: "add_to_cart_rate", label: "Tasa de agregar al carrito", source: "derived", definition: "Usuarios con add_to_cart ÷ usuarios con view_item (GA4)." },
  { id: "checkout_starts", label: "Inicios de compra", source: "ga4", definition: "Evento begin_checkout (una vez por sesión y carrito)." },
  { id: "purchase_conversion", label: "Conversión de compra", source: "derived", definition: "Pedidos pagados (base de datos) ÷ visitantes (GA4). Los pedidos no dependen de cookies; los visitantes sí: la tasa es una referencia, no una cifra exacta." },
  { id: "revenue", label: "Ingresos", source: "database", definition: "Suma del subtotal de productos de los pedidos confirmados como pagados (sin envío ni impuestos; excluye cancelados y reembolsados). Es la misma base del `value` que se envía a GA4." },
  { id: "average_order_value", label: "Ticket promedio", source: "derived", definition: "Ingresos ÷ pedidos pagados." },
  { id: "product_performance", label: "Rendimiento por producto", source: "database", definition: "Unidades e ingresos por producto en pedidos pagados, con su stock disponible actual (catálogo)." },
  { id: "traffic_source", label: "Fuente de tráfico", source: "ga4", definition: "Origen / medio de la sesión (GA4, informe Adquisición de tráfico)." },
] as const;

/** Un pedido pagado, con solo lo necesario para reportar (sin datos personales). */
export type PaidOrderRow = {
  orderNumber: string;
  paidAt: Date;
  currency: string;
  subtotal: number;
  taxTotal: number;
  shippingTotal: number;
  total: number;
  country: string;
  items: { productKey: string; name: string; quantity: number; lineTotal: number }[];
};

export type CommerceSummary = {
  currency: string;
  orders: number;
  /** Pedidos en otra moneda: no se suman para no mezclar monedas. */
  otherCurrencyOrders: number;
  revenue: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  averageOrderValue: number;
  units: number;
  topProducts: { productKey: string; name: string; units: number; revenue: number }[];
  byCountry: { country: string; orders: number; revenue: number }[];
  byDay: { day: string; orders: number; revenue: number }[];
};

const dayKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

export function summarizeOrders(rows: readonly PaidOrderRow[], currency = "CRC"): CommerceSummary {
  const own = rows.filter((row) => row.currency === currency);
  const products = new Map<string, { productKey: string; name: string; units: number; revenue: number }>();
  const countries = new Map<string, { country: string; orders: number; revenue: number }>();
  const days = new Map<string, { day: string; orders: number; revenue: number }>();
  let units = 0;
  for (const order of own) {
    const country = countries.get(order.country) ?? { country: order.country, orders: 0, revenue: 0 };
    country.orders += 1;
    country.revenue += order.subtotal;
    countries.set(order.country, country);
    const key = dayKey(order.paidAt);
    const day = days.get(key) ?? { day: key, orders: 0, revenue: 0 };
    day.orders += 1;
    day.revenue += order.subtotal;
    days.set(key, day);
    for (const item of order.items) {
      units += item.quantity;
      const entry = products.get(item.productKey) ?? { productKey: item.productKey, name: item.name, units: 0, revenue: 0 };
      entry.units += item.quantity;
      entry.revenue += item.lineTotal;
      products.set(item.productKey, entry);
    }
  }
  const revenue = own.reduce((sum, order) => sum + order.subtotal, 0);
  return {
    currency,
    orders: own.length,
    otherCurrencyOrders: rows.length - own.length,
    revenue,
    taxTotal: own.reduce((sum, order) => sum + order.taxTotal, 0),
    shippingTotal: own.reduce((sum, order) => sum + order.shippingTotal, 0),
    grandTotal: own.reduce((sum, order) => sum + order.total, 0),
    averageOrderValue: own.length === 0 ? 0 : Math.round(revenue / own.length),
    units,
    topProducts: [...products.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue || a.name.localeCompare(b.name)),
    byCountry: [...countries.values()].sort((a, b) => b.revenue - a.revenue),
    byDay: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)),
  };
}

/** Cifras de GA4 (se cargan a mano o, en el futuro, desde la API de datos de GA4). */
export type Ga4Funnel = { visitors: number; productViewers: number; addToCartUsers: number; checkoutStarts: number };

export type FunnelRates = { addToCartRate: number | null; checkoutRate: number | null; purchaseConversion: number | null };

const ratio = (part: number, whole: number): number | null => (whole > 0 ? part / whole : null);

export function funnelRates(ga: Ga4Funnel, paidOrders: number): FunnelRates {
  return {
    addToCartRate: ratio(ga.addToCartUsers, ga.productViewers),
    checkoutRate: ratio(ga.checkoutStarts, ga.addToCartUsers),
    purchaseConversion: ratio(paidOrders, ga.visitors),
  };
}
