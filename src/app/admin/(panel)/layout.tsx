import { AdminShell } from "@/components/admin/AdminShell";
import { logoutAction } from "@/server/actions/auth";
import { requireStaff } from "@/server/auth";

/**
 * Entrada del panel. La autorización se hace AQUÍ, en el servidor, antes de
 * renderizar nada: sin sesión → login; con sesión pero sin rol de equipo → 404.
 *
 * Ojo: este layout protege las PÁGINAS. Las Server Actions administrativas
 * deben llamar a `requirePermission(...)` por su cuenta (ver guards.ts).
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaff();

  return (
    <AdminShell role={session.role} email={session.email} logoutAction={logoutAction}>
      {children}
    </AdminShell>
  );
}
