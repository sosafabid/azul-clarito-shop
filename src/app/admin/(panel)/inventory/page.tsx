import type { Metadata } from "next";
import Link from "next/link";
import { DatabaseNotice, Notice } from "@/components/admin/Notice";
import { StockStateBadge } from "@/components/admin/ProductStatusBadge";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { summarizeInventory } from "@/domain/inventory-view";
import { formatMoney, toCurrency } from "@/domain/money";
import { catalogCapabilities } from "@/domain/capabilities";
import { redactCosts } from "@/domain/redaction";
import { requirePermission } from "@/server/auth";
import { listInventoryItems } from "@/server/services/inventory/admin";

export const metadata: Metadata = { title: "Inventario" };

const th = "px-3 py-3 text-left font-display text-xs font-bold uppercase tracking-wider text-ink/60";
const td = "px-3 py-3 align-top";

export default async function AdminInventoryPage() {
  const session = await requirePermission("inventory:read");
  const caps = catalogCapabilities(session.role);

  // Sin `costs:read` los costos y valores se quitan en el servidor y no se muestran.
  const fetched = isDatabaseConfigured() ? await listInventoryItems(getDb()) : null;
  const items = fetched && redactCosts(fetched, caps.costs);
  const summary = items ? summarizeInventory(items, "CRC") : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventario</h1>
        <p className="mt-1 text-sm text-ink/70">
          Disponible = se puede vender ahora · Reservado = retenido por compras en curso · Vendido = acumulado. Solo
          lectura: el stock disponible se edita desde cada producto.
        </p>
      </div>

      {items === null && <DatabaseNotice />}

      {items && summary && (
        <>
          <dl className="grid gap-4 sm:grid-cols-3">
            {(caps.costs
              ? [
                  ["Valor del inventario (al costo)", formatMoney(summary.valueAtCost, "CRC")],
                  ["Valor de venta potencial", formatMoney(summary.potentialSalesValue, "CRC")],
                  ["Stock bajo / sin stock", `${summary.lowCount} / ${summary.outCount}`],
                ]
              : [["Stock bajo / sin stock", `${summary.lowCount} / ${summary.outCount}`]]
            ).map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-celeste bg-paper p-4">
                <dt className="text-xs font-bold uppercase tracking-wider text-ink/60">{label}</dt>
                <dd className="mt-1 font-display text-2xl font-bold text-navy">{value}</dd>
              </div>
            ))}
          </dl>
          {caps.costs && summary.itemsWithoutCost > 0 && (
            <Notice tone="warning">{summary.itemsWithoutCost} producto(s) sin costo no entran en el valor al costo.</Notice>
          )}

          {items.length === 0 ? (
            <Notice>Todavía no hay inventario.</Notice>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-celeste bg-paper">
              <table className="w-full min-w-[44rem] text-sm">
                <thead className="border-b border-celeste bg-celeste/30">
                  <tr>
                    <th className={th}>Producto</th>
                    <th className={th}>Estado</th>
                    <th className={th}>Disponible</th>
                    <th className={th}>Reservado</th>
                    <th className={th}>Vendido</th>
                    {caps.costs && (
                      <>
                        <th className={th}>Valor (costo)</th>
                        <th className={th}>Valor (venta)</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-celeste/60">
                  {items.map((item) => {
                    const currency = toCurrency(item.currency);
                    return (
                      <tr key={item.inventoryId}>
                        <td className={td}>
                          <Link href={routes.adminProduct(item.productId)} className="font-display font-bold text-navy hover:underline">
                            {item.name}
                            {item.variantName ? ` — ${item.variantName}` : ""}
                          </Link>
                          <div className="text-xs text-ink/60">{item.sku}</div>
                        </td>
                        <td className={td}>
                          <StockStateBadge state={item.state} />
                        </td>
                        <td className={td}>{item.availableStock}</td>
                        <td className={td}>{item.reservedStock}</td>
                        <td className={td}>{item.soldStock}</td>
                        {caps.costs && (
                          <>
                            <td className={td}>
                              {item.inventory.inventoryValueAtCost === null ? "—" : formatMoney(item.inventory.inventoryValueAtCost, currency)}
                            </td>
                            <td className={td}>{formatMoney(item.inventory.potentialSalesValue, currency)}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
