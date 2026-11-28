import type { Metadata } from "next";
import { DatabaseNotice } from "@/components/admin/Notice";
import { card } from "@/components/admin/settings-ui";
import { Notice } from "@/components/ui/Notice";
import { analyticsConfig } from "@/config/analytics";
import { getDb, isDatabaseConfigured } from "@/db";
import { METRIC_DEFINITIONS, summarizeOrders } from "@/domain/commerce-metrics";
import { formatMoney, toCurrency } from "@/domain/money";
import { countryName } from "@/domain/shipping";
import { requirePermission } from "@/server/auth";
import { loadCatalogSnapshot, loadPaidOrders } from "@/server/services/reports/commerce";

export const metadata: Metadata = { title: "Reportes", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const PERIODS = [7, 30, 90, 365] as const;
const sourceLabel = { ga4: "GA4", database: "Base de datos", catalog: "Catálogo", derived: "Calculada" } as const;

/**
 * REPORTE COMERCIAL (solo lectura, solo SUPER_ADMIN). Las ventas salen de los pedidos pagados en la base de datos (no de GA4);
 * el tráfico y el comportamiento se consultan en GA4. No hay datos históricos inventados: si no hay pedidos, se muestra vacío.
 */
export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  await requirePermission("reports:read");
  if (!isDatabaseConfigured()) return <DatabaseNotice />;
  const requested = Number((await searchParams).dias);
  const days = (PERIODS as readonly number[]).includes(requested) ? requested : 30;
  const [rows, catalog] = await Promise.all([loadPaidOrders(getDb(), days), loadCatalogSnapshot(getDb())]);
  const summary = summarizeOrders(rows, "CRC");
  const money = (amount: number) => formatMoney(amount, toCurrency(summary.currency));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reportes comerciales</h1>
        <p className="mt-1 text-sm text-ink/70">Ventas reales de los últimos {days} días: pedidos con pago confirmado, sin cancelados ni reembolsados.</p>
        <nav aria-label="Periodo" className="mt-3 flex flex-wrap gap-2 text-sm">
          {PERIODS.map((period) => (
            <a key={period} href={`?dias=${period}`} aria-current={period === days ? "true" : undefined} className={`rounded-full border-2 px-4 py-1 font-display font-bold ${period === days ? "border-navy bg-navy text-paper" : "border-celeste text-navy hover:border-navy"}`}>
              {period} días
            </a>
          ))}
        </nav>
      </div>

      {summary.otherCurrencyOrders > 0 && <Notice tone="warning">Hay {summary.otherCurrencyOrders} pedido(s) en otra moneda que no se suman aquí para no mezclar monedas.</Notice>}

      <section aria-label="Resumen" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Pedidos pagados", String(summary.orders)],
          ["Ingresos (productos)", money(summary.revenue)],
          ["Ticket promedio", money(summary.averageOrderValue)],
          ["Unidades vendidas", String(summary.units)],
        ].map(([label, value]) => (
          <div key={label} className={card}>
            <p className="text-xs font-bold uppercase tracking-wide text-ink/60">{label}</p>
            <p className="mt-2 font-display text-3xl font-bold text-navy">{value}</p>
          </div>
        ))}
      </section>
      <p className="text-xs text-ink/60">Ingresos = subtotal de productos. Envío cobrado: {money(summary.shippingTotal)} · Impuestos: {money(summary.taxTotal)} · Total cobrado: {money(summary.grandTotal)}.</p>

      <section className={card}>
        <h2 className="text-xl font-bold">Rendimiento por producto</h2>
        {summary.topProducts.length === 0 ? (
          <p className="mt-3 text-sm text-ink/70">Todavía no hay ventas en este periodo.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead><tr className="border-b border-celeste text-xs uppercase tracking-wide text-ink/60"><th className="py-2 pr-4">Producto</th><th className="py-2 pr-4">Unidades</th><th className="py-2">Ingresos</th></tr></thead>
              <tbody>{summary.topProducts.slice(0, 20).map((p) => <tr key={p.productKey} className="border-b border-celeste/50"><td className="py-2 pr-4 font-semibold text-navy">{p.name}</td><td className="py-2 pr-4">{p.units}</td><td className="py-2">{money(p.revenue)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-bold">Por país de entrega</h2>
          {summary.byCountry.length === 0 ? <p className="mt-3 text-sm text-ink/70">Sin ventas en este periodo.</p> : (
            <ul className="mt-3 divide-y divide-celeste/60 text-sm">{summary.byCountry.map((c) => <li key={c.country} className="flex justify-between gap-4 py-2"><span>{c.country === "CR" ? "Costa Rica" : countryName(c.country)} · {c.orders} pedido(s)</span><span className="font-semibold">{money(c.revenue)}</span></li>)}</ul>
          )}
        </section>
        <section className={card}>
          <h2 className="text-xl font-bold">Catálogo</h2>
          <p className="mt-3 text-sm text-ink/80">Productos activos: <strong>{catalog.activeProducts}</strong>. Productos físicos activos sin unidades disponibles: <strong>{catalog.physicalOutOfStock}</strong>.</p>
        </section>
      </div>

      <section className={card}>
        <h2 className="text-xl font-bold">Tráfico y comportamiento (GA4)</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/80">
          {analyticsConfig.gaMeasurementId
            ? "GA4 está configurado en la tienda. Visitantes, vistas de producto, carritos, inicios de compra y fuentes de tráfico se consultan en GA4 (Informes → Adquisición y Monetización → Compras de comercio electrónico)."
            : "GA4 todavía no está configurado (falta NEXT_PUBLIC_GA_MEASUREMENT_ID). Cuando lo esté, el tráfico y el comportamiento se consultan allí."}{" "}
          Esta pantalla no muestra cifras de GA4 porque requieren conectar la API de datos de GA4 (pendiente; ver docs/analytics-and-commerce-tracking.md). Las ventas de arriba no dependen de cookies y son las cifras oficiales.
        </p>
        <h3 className="mt-5 font-display text-lg font-bold text-navy">Definición de métricas</h3>
        <dl className="mt-2 space-y-3 text-sm">
          {METRIC_DEFINITIONS.map((m) => (
            <div key={m.id}>
              <dt className="font-semibold text-navy">{m.label} <span className="ml-1 rounded-full bg-celeste/60 px-2 py-0.5 text-[11px] font-bold">{sourceLabel[m.source]}</span></dt>
              <dd className="text-ink/75">{m.definition}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
