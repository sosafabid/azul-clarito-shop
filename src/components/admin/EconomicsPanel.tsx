import { formatMoney, toCurrency } from "@/domain/money";
import { formatPercent, unitEconomics } from "@/domain/product-economics";
import type { StockSummary } from "@/server/services/catalog/admin";

/**
 * Economía del producto (INFORMACIÓN PRIVADA del panel).
 * Utilidad bruta = precio − costo · Margen bruto % = utilidad / precio × 100.
 * No es utilidad neta: no incluye gastos operativos, empaque, comisiones ni publicidad.
 */
export function EconomicsPanel({ price, cost, currency, stock }: { price: number; cost: number | null; currency: string; stock: StockSummary }) {
  const code = toCurrency(currency);
  const unit = unitEconomics(price, cost);
  const money = (value: number | null) => (value === null ? "—" : formatMoney(value, code));

  const cards: [string, string][] = [
    ["Precio de venta", money(price)],
    ["Costo", money(cost)],
    ["Utilidad bruta por unidad", money(unit.grossProfitPerUnit)],
    ["Margen bruto", formatPercent(unit.marginPercent)],
    ["Valor del inventario (al costo)", money(stock.valueAtCost)],
    ["Venta potencial", money(stock.potentialSales)],
    ["Utilidad potencial", money(stock.potentialProfit)],
  ];

  return (
    <section className="space-y-4 rounded-3xl border border-celeste bg-paper p-5 sm:p-7">
      <div>
        <h2 className="text-xl font-bold">Economía del producto</h2>
        <p className="mt-1 text-sm text-ink/70">Privado: solo lo ve el equipo. Utilidad bruta, no neta (no incluye gastos operativos, empaque, comisiones ni publicidad).</p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-celeste/30 p-4">
            <dt className="text-xs font-bold uppercase tracking-wider text-ink/60">{label}</dt>
            <dd className="mt-1 font-display text-xl font-bold text-navy">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-ink/70">
        Stock: <strong className="text-navy">{stock.available}</strong> disponibles · <strong className="text-navy">{stock.reserved}</strong> reservados ·{" "}
        <strong className="text-navy">{stock.sold}</strong> vendidos.
      </p>
      {unit.isLoss && <p className="rounded-xl bg-coral/15 px-4 py-2 text-sm font-semibold text-navy">⚠️ El precio es menor que el costo: se vende con pérdida.</p>}
      {stock.rowsWithoutCost > 0 && <p className="text-sm text-ink/70">Hay stock sin costo registrado: no entra en el valor del inventario ni en la utilidad potencial.</p>}
    </section>
  );
}
