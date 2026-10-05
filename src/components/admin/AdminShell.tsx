import Link from "next/link";
import { adminNav } from "@/config/navigation";
import { routes } from "@/config/routes";

type AdminShellProps = {
  children: React.ReactNode;
  role: string;
  /** Verdadero cuando se está usando la sesión falsa de desarrollo. */
  devPreview: boolean;
};

/** Estructura visual del panel (solo UI: la autorización ocurre en el servidor). */
export function AdminShell({ children, role, devPreview }: AdminShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-celeste/25 md:flex-row">
      <aside className="border-b border-celeste bg-paper md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4 md:block">
          <Link href={routes.admin} className="font-display text-lg font-bold text-navy">
            Azul Clarito Shop
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
              Administración
            </span>
          </Link>
        </div>
        <nav aria-label="Administración" className="px-3 pb-3 md:pb-6">
          <ul className="flex gap-1 overflow-x-auto md:flex-col">
            {adminNav.map((item) => (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  className="block rounded-xl px-4 py-2.5 font-display text-sm font-semibold text-navy hover:bg-celeste/60"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-celeste bg-paper px-5 py-3 text-sm sm:px-8">
          <span className="text-ink/70">
            Rol: <strong className="text-navy">{role}</strong>
          </span>
          {devPreview && (
            <span className="rounded-full bg-sun/50 px-3 py-1 text-xs font-bold text-navy">
              Vista previa de desarrollo — sin autenticación
            </span>
          )}
          <Link href={routes.home} className="font-semibold text-navy underline underline-offset-4">
            Ver tienda
          </Link>
        </div>
        <main id="contenido" className="flex-1 p-5 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
