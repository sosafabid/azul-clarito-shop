import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { routes } from "@/config/routes";

export const metadata: Metadata = { title: "Pedidos" };

export default function AdminOrdersPage() {
  return (
    <ComingSoon
      compact
      title="Pedidos"
      description="Acá vas a revisar y gestionar los pedidos."
      back={{ label: "Volver al panel", href: routes.admin }}
    />
  );
}
