import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/Notice";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { customerStatus } from "@/domain/customer-orders";
import { formatMoney, toCurrency } from "@/domain/money";
import { requireUser } from "@/server/auth";
import { getAccountOverview } from "@/server/services/accounts";
import { listCustomerOrders } from "@/server/services/orders/customer";

export const metadata: Metadata = { title: "Mis pedidos", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("es-CR", { dateStyle: "long", timeZone: "America/Costa_Rica" });
const TONE: Record<string, string> = {
  pending: "bg-sun/40 text-ink",
  progress: "bg-aqua/25 text-navy",
  done: "bg-celeste text-navy",
  closed: "bg-ink/10 text-ink/70",
};

export default async function AccountOrdersPage() {
  const session = await requireUser(); // los pedidos son de cada persona: exige sesión
  if (!isDatabaseConfigured()) redirect(routes.account);
  const db = getDb();
  const overview = await getAccountOverview(db, session.userId);
  if (!overview) redirect(routes.accountLogin);
  const orders = await listCustomerOrders(db, { userId: overview.id, email: overview.email, emailVerified: Boolean(overview.emailVerifiedAt) });

  return (
    <section className="bg-paper py-12 sm:py-16">
      <Container size="narrow" className="max-w-3xl space-y-6">
        <Link href={routes.account} className="text-sm font-semibold text-navy underline underline-offset-4">← Volver a mi cuenta</Link>
        <h1 className="text-4xl font-bold">Mis pedidos</h1>
        {!overview.emailVerifiedAt && (
          <Notice tone="warning">Verificá tu correo para ver también los pedidos que hiciste como invitada/o con {overview.email}.</Notice>
        )}
        {orders.length === 0 ? (
          <div className="rounded-3xl border border-celeste bg-paper p-8 text-center">
            <p className="text-lg font-semibold text-navy">Todavía no tenés pedidos.</p>
            <Link href={routes.shop} className="mt-5 inline-flex min-h-12 items-center rounded-full bg-navy px-8 py-3 font-display font-bold text-paper hover:bg-ink">Ir a la tienda</Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => {
              const status = customerStatus(order.status, order.requiresShipping);
              return (
                <li key={order.orderNumber}>
                  <Link href={routes.accountOrder(order.orderNumber)} className="block rounded-3xl border border-celeste bg-paper p-5 transition-colors hover:border-navy sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-display text-lg font-bold text-navy">Pedido {order.orderNumber}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${TONE[status.tone]}`}>{status.label}</span>
                    </div>
                    <p className="mt-2 text-sm text-ink/75">
                      {dateFormat.format(order.placedAt)} · {order.itemCount === 1 ? "1 producto" : `${order.itemCount} productos`}
                      {order.firstItemName ? ` · ${order.firstItemName}${order.itemCount > 1 ? " y más" : ""}` : ""}
                    </p>
                    <p className="mt-2 font-semibold text-navy">{formatMoney(order.total, toCurrency(order.currency))}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </section>
  );
}
