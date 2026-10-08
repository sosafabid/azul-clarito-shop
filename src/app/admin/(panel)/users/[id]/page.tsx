import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DatabaseNotice, Notice } from "@/components/admin/Notice";
import { AssignStaffForm, RemoveStaffForm, StaffAccessForm } from "@/components/admin/UserAdminForms";
import { card } from "@/components/admin/settings-ui";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { isUuid } from "@/domain/ids";
import { USER_AUDIT_LABELS, type UserAuditAction } from "@/domain/user-admin";
import { changeRoleAction, setStaffAccessAction } from "@/server/actions/users";
import { requirePermission } from "@/server/auth";
import { getUser, getUserHistory } from "@/server/services/users/admin";

export const metadata: Metadata = { title: "Cuenta · Usuarios y roles" };

const dateTimeFormat = new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Costa_Rica" });

const CHANGE_NOTICES: Record<string, string> = {
  asignado: "Rol actualizado. La cuenta ahora es STAFF.",
  retirado: "Rol actualizado. La cuenta volvió a CUSTOMER y se cerraron sus sesiones.",
  suspendido: "Acceso suspendido y sesiones cerradas.",
  reactivado: "Acceso reactivado.",
};

export default async function AdminUserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cambio?: string | string[] }> }) {
  const session = await requirePermission("users:manage-roles");
  if (!isDatabaseConfigured()) return <DatabaseNotice />;
  const { id } = await params;
  const { cambio } = await searchParams;
  const notice = typeof cambio === "string" ? CHANGE_NOTICES[cambio] : undefined;
  if (!isUuid(id)) notFound();
  const db = getDb();
  const user = await getUser(db, id);
  if (!user) notFound();
  const history = await getUserHistory(db, id);
  const isSelf = user.id === session.userId;

  return (
    <div className="space-y-6">
      <div>
        <Link href={routes.adminUsers} className="text-sm font-semibold text-navy underline underline-offset-4">← Usuarios y roles</Link>
        <h1 className="mt-2 text-3xl font-bold">{user.name ?? "Sin nombre"}</h1>
        <p className="mt-1 break-all text-sm text-ink/70">{user.email}</p>
      </div>

      {notice && <Notice tone="success">{notice}</Notice>}

      <section className={card}>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-xs uppercase text-ink/60">Rol</dt><dd className="font-bold" data-testid="user-role">{user.role}</dd></div>
          <div><dt className="text-xs uppercase text-ink/60">Estado</dt><dd className="font-bold">{user.isActive ? "Activa" : "Suspendida"}</dd></div>
          <div><dt className="text-xs uppercase text-ink/60">Correo</dt><dd className="font-bold">{user.emailVerifiedAt ? "Verificado" : "No verificado"}</dd></div>
          <div><dt className="text-xs uppercase text-ink/60">Última actividad</dt><dd className="font-bold">{user.lastLoginAt ? dateTimeFormat.format(user.lastLoginAt) : "—"}</dd></div>
        </dl>
      </section>

      <section className={card}>
        <h2 className="text-xl font-bold">Rol y acceso</h2>
        {isSelf ? (
          <p className="mt-2 text-sm text-ink/70">Esta es tu propia cuenta: no podés cambiar tu rol ni tu acceso.</p>
        ) : user.role === "SUPER_ADMIN" ? (
          <p className="mt-2 text-sm text-ink/70">Las cuentas SUPER_ADMIN están protegidas y no se modifican desde el panel.</p>
        ) : user.role === "CUSTOMER" ? (
          <div className="mt-3 max-w-lg">
            <AssignStaffForm action={changeRoleAction} userId={user.id} />
          </div>
        ) : (
          <div className="mt-3 grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="font-display text-sm font-bold text-navy">{user.isActive ? "Suspender acceso" : "Acceso suspendido"}</h3>
              <div className="mt-2"><StaffAccessForm action={setStaffAccessAction} userId={user.id} suspended={!user.isActive} /></div>
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-navy">Retirar el rol STAFF</h3>
              <div className="mt-2"><RemoveStaffForm action={changeRoleAction} userId={user.id} /></div>
            </div>
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="text-xl font-bold">Historial</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-ink/70">Esta cuenta no tiene cambios de rol ni de acceso registrados.</p>
        ) : (
          <ul className="mt-3 divide-y divide-celeste/60 text-sm" data-testid="user-history">
            {history.map((h) => (
              <li key={h.id} className="py-2.5">
                <span className="font-semibold">{USER_AUDIT_LABELS[h.action as UserAuditAction] ?? h.action}</span>
                {h.previousRole !== h.newRole && (h.previousRole || h.newRole) && <span> · {h.previousRole ?? "—"} → {h.newRole ?? "—"}</span>}
                {h.result === "denied" && <span className="font-semibold text-coral"> · rechazado</span>}
                <span className="block text-xs text-ink/60">{dateTimeFormat.format(h.createdAt)} · por {h.actor ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
