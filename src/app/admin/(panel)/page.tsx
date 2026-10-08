import Link from "next/link";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { adminNav } from "@/config/navigation";
import { routes } from "@/config/routes";
import { can } from "@/domain/permissions";
import { requireStaff } from "@/server/auth";

export default async function AdminHomePage() {
  const session = await requireStaff();
  // Solo se listan las secciones a las que esta persona tiene acceso (cada página igual lo exige en el servidor).
  const sections = adminNav.filter((item) => item.href !== routes.admin && (!item.permission || can(session.role, item.permission)));

  return (
    <div className="space-y-8">
      <ComingSoon
        compact
        title="Panel administrativo"
        description="Acá va a vivir la gestión de productos, pedidos, inventario y clientes."
        back={{ label: "Ver tienda", href: routes.home }}
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sections.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block rounded-2xl border border-celeste bg-paper p-5 font-display text-lg font-bold text-navy transition-colors hover:bg-celeste/40"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
