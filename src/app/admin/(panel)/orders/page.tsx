import type { Metadata } from "next";
import Link from "next/link";
import { ReconcileButton } from "@/components/admin/OrderActions";
import { DatabaseNotice, Notice } from "@/components/admin/Notice";
import { card } from "@/components/admin/settings-ui";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { formatMoney, toCurrency } from "@/domain/money";
import { can } from "@/domain/permissions";
import { requirePermission } from "@/server/auth";
import { readTilopayConfig } from "@/server/payments/tilopay/config";
import { listAdminOrders } from "@/server/services/orders/admin";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/components/admin/order-labels";

export const metadata: Metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Costa_Rica" });

export default async function AdminOrdersPage() {
  const session = await requirePermission("orders:read");
  if (!isDatabaseConfigured()) return <DatabaseNotice />;
  const rows = await listAdminOrders(getDb());
  const canManage = can(session.role, "orders:fulfill");
  // El estado de la pasarela (sin valores ni credenciales) lo ve solo quien administra integraciones.
  const gateway = can(session.role, "integrations:manage") ? readTilopayConfig() : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="mt-1 text-sm text-ink/70">Pedidos de la tienda con el estado del pedido y del pago. El pago solo se marca como confirmado cuando Tilopay lo verifica.</p>
        </div>
        {canManage && <ReconcileButton />}
      </div>

      {gateway && (
        gateway.ok ? (
          <Notice tone={gateway.config.mode === "sandbox" ? "info" : "warning"}>
            Pasarela Tilopay: <strong>{gateway.config.mode === "sandbox" ? "modo de PRUEBAS (sandbox) — no se hacen cobros reales" : "modo PRODUCCIÓN — cobros reales"}</strong>.
          </Notice>
        ) : (
          <Notice tone="warning">
            Pasarela Tilopay: <strong>deshabilitada</strong> ({gateway.reason === "not_configured" ? `faltan las variables ${gateway.missing.join(", ")}` : gateway.reason === "invalid_mode" ? "TILOPAY_MODE tiene un valor no válido" : "el modo producción no está confirmado"}). El checkout no cobra hasta configurarla.
          </Notice>
        )
      )}

      <section className={card}>
        {rows.length === 0 ? (
          <p className="text-sm text-ink/70">Todavía no hay pedidos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead>
                <tr className="border-b border-celeste text-xs uppercase tracking-wide text-ink/60">
                  <th className="py-2 pr-4 font-semibold">Pedido</th>
                  <th className="py-2 pr-4 font-semibold">Fecha</th>
                  <th className="py-2 pr-4 font-semibold">Clienta</th>
                  <th className="py-2 pr-4 font-semibold">Total</th>
                  <th className="py-2 pr-4 font-semibold">Pedido</th>
                  <th className="py-2 font-semibold">Pago</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-celeste/50">
                    <td className="py-2.5 pr-4 font-semibold"><Link href={routes.adminOrder(row.id)} className="text-navy underline underline-offset-4">{row.orderNumber}</Link></td>
                    <td className="py-2.5 pr-4">{dateFormat.format(row.placedAt)}</td>
                    <td className="py-2.5 pr-4">{row.customerName ?? "—"}<span className="block break-all text-xs text-ink/60">{row.email}</span></td>
                    <td className="py-2.5 pr-4">{formatMoney(row.total, toCurrency(row.currency))}</td>
                    <td className="py-2.5 pr-4">{ORDER_STATUS_LABELS[row.status]}</td>
                    <td className="py-2.5">
                      {row.paymentStatus ? PAYMENT_STATUS_LABELS[row.paymentStatus] ?? row.paymentStatus : "—"}
                      {row.needsReview && <span className="ml-2 inline-flex rounded-full bg-coral/20 px-2 py-0.5 text-xs font-bold text-navy">Revisar</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
