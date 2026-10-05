import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { routes } from "@/config/routes";

export const metadata: Metadata = { title: "Clientes" };

export default function AdminCustomersPage() {
  return (
    <ComingSoon
      compact
      title="Clientes"
      description="Acá vas a ver la información de tus clientas."
      back={{ label: "Volver al panel", href: routes.admin }}
    />
  );
}
