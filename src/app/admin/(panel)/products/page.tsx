import type { Metadata } from "next";
import Link from "next/link";
import { DatabaseNotice, Notice } from "@/components/admin/Notice";
import { PRODUCT_NOTICES } from "@/components/admin/notices";
import { ProductActionButtons } from "@/components/admin/ProductActionButtons";
import { ProductStatusBadge } from "@/components/admin/ProductStatusBadge";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { formatMoney, toCurrency } from "@/domain/money";
import { formatPercent, unitEconomics } from "@/domain/product-economics";
import { PRODUCT_FILTERS, PRODUCT_FILTER_LABELS, parseProductFilter, parseSearch } from "@/domain/product-lifecycle";
import { requirePermission } from "@/server/auth";
import { LIST_LIMIT, listAdminProducts } from "@/server/services/catalog/admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Productos" };

const th = "px-3 py-3 text-left font-display text-xs font-bold uppercase tracking-wider text-ink/60";
const td = "px-3 py-3 align-top";

/** Codifica texto para una URL de retorno permitida (solo caracteres seguros). */
const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ estado?: string; q?: string; saved?: string }> }) {
  // Autorización en el servidor, además del guard del layout (defensa en profundidad).
  await requirePermission("products:read");
  await requirePermission("costs:read");
  const params = await searchParams;
  const filter = parseProductFilter(params.estado);
  const search = parseSearch(params.q);
  const notice = params.saved ? PRODUCT_NOTICES[params.saved] : undefined;

  const list = isDatabaseConfigured() ? await listAdminProducts(getDb(), { filter, search }) : null;

  const href = (estado: string, q = search) => `${routes.adminProducts}?estado=${estado}${q ? `&q=${encode(q)}` : ""}`;
  const returnTo = href(filter);

  // Totales de lo que se está viendo (solo colones; el valor al costo solo suma stock con costo conocido).
  const totals = (list?.items ?? []).reduce(
    (acc, row) => {
      if (row.currency !== "CRC") return acc;
      acc.cost += row.stock.valueAtCost ?? 0;
      acc.sales += row.stock.potentialSales;
      acc.profit += row.stock.potentialProfit ?? 0;
      return acc;
    },
    { cost: 0, sales: 0, profit: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Productos</h1>
          <p className="mt-1 text-sm text-ink/70">Utilidad bruta = precio − costo. No incluye gastos operativos, empaque, comisiones ni publicidad.</p>
        </div>
        <Link href={routes.adminProductNew} className="inline-flex min-h-11 items-center rounded-full bg-navy px-6 py-2.5 font-display text-sm font-bold text-paper hover:bg-ink">
          Nuevo producto
        </Link>
      </div>

      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {list === null && <DatabaseNotice />}

      {list && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
              {PRODUCT_FILTERS.map((key) => (
                <Link
                  key={key}
                  href={href(key)}
                  aria-current={filter === key ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-full border-2 px-4 py-1.5 font-display text-sm font-bold",
                    filter === key ? "border-navy bg-navy text-paper" : "border-celeste text-navy hover:bg-celeste/40",
                  )}
                >
                  {PRODUCT_FILTER_LABELS[key]}
                  <span className={cn("rounded-full px-2 text-xs", filter === key ? "bg-paper/20" : "bg-celeste/60")}>{list.counts[key]}</span>
                </Link>
              ))}
            </nav>
            <form method="get" action={routes.adminProducts} role="search" className="flex gap-2">
              <input type="hidden" name="estado" value={filter} />
              <input
                name="q"
                defaultValue={search}
                maxLength={100}
                placeholder="Buscar por nombre, SKU o slug"
                aria-label="Buscar productos"
                className="w-64 max-w-full rounded-full border-2 border-celeste bg-paper px-4 py-2 text-sm focus:border-aqua focus:outline-none"
              />
              <button type="submit" className="inline-flex min-h-10 items-center rounded-full border-2 border-navy px-4 py-1.5 font-display text-sm font-bold text-navy hover:bg-navy hover:text-paper">
                Buscar
              </button>
              {search && (
                <Link href={href(filter, "")} className="inline-flex min-h-10 items-center px-2 font-display text-sm font-bold text-navy underline underline-offset-4">
                  Limpiar
                </Link>
              )}
            </form>
          </div>

          <dl className="grid gap-4 sm:grid-cols-4">
            {[
              ["Productos (en esta vista)", String(list.matching)],
              ["Valor del inventario (al costo)", formatMoney(totals.cost, "CRC")],
              ["Venta potencial", formatMoney(totals.sales, "CRC")],
              ["Utilidad potencial", formatMoney(totals.profit, "CRC")],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-celeste bg-paper p-4">
                <dt className="text-xs font-bold uppercase tracking-wider text-ink/60">{label}</dt>
                <dd className="mt-1 font-display text-2xl font-bold text-navy">{value}</dd>
              </div>
            ))}
          </dl>

          {list.matching > list.items.length && (
            <Notice tone="warning">Se muestran los primeros {LIST_LIMIT} de {list.matching}. Afiná la búsqueda para ver el resto.</Notice>
          )}

          {list.items.length === 0 ? (
            <Notice>
              {search || filter !== "todos" ? "No hay productos que coincidan con la búsqueda o el filtro." : "Todavía no hay productos. Creá el primero con “Nuevo producto”."}
            </Notice>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-celeste bg-paper">
              <table className="w-full min-w-[72rem] text-sm">
                <thead className="border-b border-celeste bg-celeste/30">
                  <tr>
                    <th className={th}>Producto</th>
                    <th className={th}>Precio</th>
                    <th className={th}>Costo</th>
                    <th className={th}>Utilidad / u</th>
                    <th className={th}>Margen</th>
                    <th className={th}>Disp. · Res. · Vend.</th>
                    <th className={th}>Valor inv.</th>
                    <th className={th}>Venta pot.</th>
                    <th className={th}>Utilidad pot.</th>
                    <th className={th}>Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-celeste/60">
                  {list.items.map((row) => {
                    const currency = toCurrency(row.currency);
                    const unit = unitEconomics(row.price, row.cost);
                    const money = (v: number | null) => (v === null ? "—" : formatMoney(v, currency));
                    return (
                      <tr key={row.id}>
                        <td className={td}>
                          <Link href={routes.adminProduct(row.id)} className="font-display font-bold text-navy hover:underline">
                            {row.name}
                          </Link>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink/60">
                            <span>{row.sku}</span>
                            <ProductStatusBadge status={row.status} />
                            {row.variantCount > 0 && <span className="rounded-full bg-celeste/60 px-2 py-0.5">{row.variantCount} variante(s)</span>}
                            {row.categoryName && <span>· {row.categoryName}</span>}
                          </div>
                        </td>
                        <td className={td}>{formatMoney(row.price, currency)}</td>
                        <td className={td}>{money(row.cost)}</td>
                        <td className={td}>{money(unit.grossProfitPerUnit)}</td>
                        <td className={td}>
                          {unit.isLoss ? (
                            <span className="rounded-full bg-coral/20 px-2 py-0.5 font-bold text-navy">{formatPercent(unit.marginPercent)} ⚠ pérdida</span>
                          ) : (
                            formatPercent(unit.marginPercent)
                          )}
                        </td>
                        <td className={td}>
                          {row.stock.available} · {row.stock.reserved} · {row.stock.sold}
                        </td>
                        <td className={td}>{money(row.stock.valueAtCost)}</td>
                        <td className={td}>{money(row.stock.potentialSales)}</td>
                        <td className={td}>{money(row.stock.potentialProfit)}</td>
                        <td className={td}>
                          <div className="flex flex-col gap-2">
                            <ProductActionButtons id={row.id} status={row.status} returnTo={returnTo} compact />
                            <Link href={routes.adminProduct(row.id)} className="font-display text-xs font-bold text-navy underline underline-offset-4">
                              Editar
                            </Link>
                          </div>
                        </td>
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
