import Link from "next/link";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { adminNav } from "@/config/navigation";
import { routes } from "@/config/routes";

export default function AdminHomePage() {
  const sections = adminNav.filter((item) => item.href !== routes.admin);

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
