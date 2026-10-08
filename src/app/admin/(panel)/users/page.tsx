import type { Metadata } from "next";
import Link from "next/link";
import { DatabaseNotice } from "@/components/admin/Notice";
import { InviteStaffForm, RevokeInvitationForm } from "@/components/admin/UserAdminForms";
import { card, inputClass, primaryButton } from "@/components/admin/settings-ui";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { parsePage, parseRoleFilter, parseStatusFilter, parseUserSearch, parseVerifiedFilter, USER_ROLE_FILTERS, USER_STATUS_FILTERS, USER_VERIFIED_FILTERS } from "@/domain/user-admin";
import { inviteStaffAction, revokeInvitationAction } from "@/server/actions/users";
import { requirePermission } from "@/server/auth";
import { listUsers } from "@/server/services/users/admin";
import { listPendingInvitations } from "@/server/services/users/invitations";

export const metadata: Metadata = { title: "Usuarios y roles" };

const dateFormat = new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeZone: "America/Costa_Rica" });
const dateTimeFormat = new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Costa_Rica" });
const first = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("users:read");
  if (!isDatabaseConfigured()) return <DatabaseNotice />;
  const sp = await searchParams;
  const query = {
    search: parseUserSearch(first(sp.q)),
    role: parseRoleFilter(first(sp.rol)),
    status: parseStatusFilter(first(sp.estado)),
    verified: parseVerifiedFilter(first(sp.verificado)),
    page: parsePage(first(sp.pagina)),
  };
  const db = getDb();
  const [list, pending] = await Promise.all([listUsers(db, query), listPendingInvitations(db)]);
  const page = Math.min(query.page, list.pages);
  const href = (p: number) => {
    const params = new URLSearchParams();
    if (query.search) params.set("q", query.search);
    if (query.role !== "todos") params.set("rol", query.role);
    if (query.status !== "todos") params.set("estado", query.status);
    if (query.verified !== "todos") params.set("verificado", query.verified);
    if (p > 1) params.set("pagina", String(p));
    const qs = params.toString();
    return qs ? `${routes.adminUsers}?${qs}` : routes.adminUsers;
  };
  const filtered = query.search || query.role !== "todos" || query.status !== "todos" || query.verified !== "todos";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Usuarios y roles</h1>
        <p className="mt-1 text-sm text-ink/70">Quién tiene acceso al panel. Nunca se muestran contraseñas, claves ni enlaces.</p>
      </div>

      <section className={card}>
        <h2 className="text-xl font-bold">Invitar a una persona al equipo</h2>
        <p className="mt-1 text-sm text-ink/70">
          Le enviamos un enlace personal que vence en 72 horas y se usa una sola vez. Si el correo ya tiene cuenta, buscala abajo y asignale STAFF desde su ficha.
        </p>
        <div className="mt-4 max-w-md">
          <InviteStaffForm action={inviteStaffAction} />
        </div>
        {pending.length > 0 && (
          <div className="mt-6">
            <h3 className="font-display text-sm font-bold text-navy">Invitaciones pendientes ({pending.length})</h3>
            <ul className="mt-2 divide-y divide-celeste/60 text-sm">
              {pending.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="break-all">
                    {inv.email} <span className="text-ink/60">· vence {dateTimeFormat.format(inv.expiresAt)}</span>
                  </span>
                  <RevokeInvitationForm action={revokeInvitationAction} invitationId={inv.id} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className={card}>
        <form method="get" action={routes.adminUsers} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" role="search">
          <label className="block font-display text-xs font-bold text-navy lg:col-span-2">
            Buscar por nombre o correo
            <input name="q" defaultValue={query.search} maxLength={80} className={`${inputClass} mt-1 font-sans font-normal`} />
          </label>
          <label className="block font-display text-xs font-bold text-navy">
            Rol
            <select name="rol" defaultValue={query.role} className={`${inputClass} mt-1 font-sans font-normal`}>
              {USER_ROLE_FILTERS.map((v) => <option key={v} value={v}>{v === "todos" ? "Todos" : v}</option>)}
            </select>
          </label>
          <label className="block font-display text-xs font-bold text-navy">
            Estado
            <select name="estado" defaultValue={query.status} className={`${inputClass} mt-1 font-sans font-normal`}>
              {USER_STATUS_FILTERS.map((v) => <option key={v} value={v}>{v === "todos" ? "Todos" : v === "activo" ? "Activa" : "Suspendida"}</option>)}
            </select>
          </label>
          <label className="block font-display text-xs font-bold text-navy">
            Correo
            <select name="verificado" defaultValue={query.verified} className={`${inputClass} mt-1 font-sans font-normal`}>
              {USER_VERIFIED_FILTERS.map((v) => <option key={v} value={v}>{v === "todos" ? "Todos" : v === "verificado" ? "Verificado" : "No verificado"}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-5">
            <button type="submit" className={primaryButton}>Filtrar</button>
            {filtered && <Link href={routes.adminUsers} className="text-sm font-semibold text-navy underline underline-offset-4">Limpiar filtros</Link>}
          </div>
        </form>

        <p className="mt-5 text-sm text-ink/70">{list.total} {list.total === 1 ? "cuenta" : "cuentas"}</p>
        {list.rows.length === 0 ? (
          <p className="mt-3 text-sm text-ink/70">{filtered ? "No hay cuentas que coincidan con estos filtros." : "Todavía no hay cuentas."}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm" data-testid="users-table">
              <thead>
                <tr className="border-b border-celeste text-xs uppercase tracking-wide text-ink/60">
                  <th className="py-2 pr-4 font-semibold">Nombre</th>
                  <th className="py-2 pr-4 font-semibold">Correo</th>
                  <th className="py-2 pr-4 font-semibold">Rol</th>
                  <th className="py-2 pr-4 font-semibold">Estado</th>
                  <th className="py-2 pr-4 font-semibold">Correo verificado</th>
                  <th className="py-2 pr-4 font-semibold">Creada</th>
                  <th className="py-2 font-semibold">Última actividad</th>
                </tr>
              </thead>
              <tbody>
                {list.rows.map((u) => (
                  <tr key={u.id} className="border-b border-celeste/50">
                    <td className="py-2.5 pr-4">
                      <Link href={routes.adminUser(u.id)} className="font-semibold text-navy underline underline-offset-4">{u.name ?? "Sin nombre"}</Link>
                    </td>
                    <td className="py-2.5 pr-4 break-all">{u.email}</td>
                    <td className="py-2.5 pr-4">{u.role}</td>
                    <td className="py-2.5 pr-4">{u.isActive ? "Activa" : "Suspendida"}</td>
                    <td className="py-2.5 pr-4">{u.emailVerifiedAt ? "Verificado" : "No verificado"}</td>
                    <td className="py-2.5 pr-4">{dateFormat.format(u.createdAt)}</td>
                    <td className="py-2.5">{u.lastLoginAt ? dateTimeFormat.format(u.lastLoginAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.pages > 1 && (
          <nav aria-label="Paginación" className="mt-4 flex items-center justify-between text-sm">
            {page > 1 ? <Link href={href(page - 1)} className="font-semibold text-navy underline underline-offset-4">← Anterior</Link> : <span />}
            <span className="text-ink/70">Página {page} de {list.pages}</span>
            {page < list.pages ? <Link href={href(page + 1)} className="font-semibold text-navy underline underline-offset-4">Siguiente →</Link> : <span />}
          </nav>
        )}
      </section>
    </div>
  );
}
