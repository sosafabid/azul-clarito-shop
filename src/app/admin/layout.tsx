import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { isDevPreviewSession, requireStaff } from "@/server/auth";

export const metadata: Metadata = {
  title: { default: "Administración", template: "%s · Administración" },
  robots: { index: false, follow: false },
};

/**
 * Entrada del panel. La autorización se hace AQUÍ, en el servidor, antes de
 * renderizar nada. Sin permiso → 404.
 *
 * Ojo: este layout protege las PÁGINAS. Las Server Actions y los Route
 * Handlers administrativos deben llamar a `requireStaff()` / `requirePermission()`
 * por su cuenta (ver src/server/auth/guards.ts).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaff();

  return (
    <AdminShell role={session.role} devPreview={isDevPreviewSession(session)}>
      {children}
    </AdminShell>
  );
}
