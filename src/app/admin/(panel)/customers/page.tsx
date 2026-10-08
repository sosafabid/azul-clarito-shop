import type { Metadata } from "next";
import { DatabaseNotice } from "@/components/admin/Notice";
import { card } from "@/components/admin/settings-ui";
import { getDb, isDatabaseConfigured } from "@/db";
import { requirePermission } from "@/server/auth";
import { listAccountsForAdmin, type AdminAccountRow } from "@/server/services/customers/admin";

export const metadata: Metadata = { title: "Clientes" };

const dateFormat = new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeZone: "America/Costa_Rica" });

function VerificationBadge({ at }: { at: Date | null }) {
  return at ? (
    <span className="inline-flex rounded-full bg-aqua/20 px-3 py-1 text-xs font-bold text-navy">Verificado</span>
  ) : (
    <span className="inline-flex rounded-full bg-coral/15 px-3 py-1 text-xs font-bold text-navy">No verificado</span>
  );
}

function AccountsTable({ rows }: { rows: AdminAccountRow[] }) {
  if (rows.length === 0) return <p className="mt-3 text-sm text-ink/70">Todavía no hay cuentas.</p>;
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead>
          <tr className="border-b border-celeste text-xs uppercase tracking-wide text-ink/60">
            <th className="py-2 pr-4 font-semibold">Nombre</th>
            <th className="py-2 pr-4 font-semibold">Correo</th>
            <th className="py-2 pr-4 font-semibold">Correo verificado</th>
            <th className="py-2 font-semibold">Creada</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-celeste/50">
              <td className="py-2.5 pr-4">{row.name ?? "—"}</td>
              <td className="py-2.5 pr-4 break-all">{row.email}</td>
              <td className="py-2.5 pr-4">
                <VerificationBadge at={row.emailVerifiedAt} />
              </td>
              <td className="py-2.5">{dateFormat.format(row.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminCustomersPage() {
  await requirePermission("customers:read");
  if (!isDatabaseConfigured()) return <DatabaseNotice />;
  const db = getDb();
  const customers = await listAccountsForAdmin(db, "customers");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clientes</h1>
        <p className="mt-1 text-sm text-ink/70">Cuentas de clientas y si ya verificaron su correo. Para el equipo y los roles, andá a Usuarios y roles.</p>
      </div>

      <section className={card}>
        <h2 className="text-xl font-bold">Clientas ({customers.total})</h2>
        <AccountsTable rows={customers.rows} />
      </section>

    </div>
  );
}
