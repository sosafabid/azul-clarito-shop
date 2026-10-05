import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { routes } from "@/config/routes";

export const metadata: Metadata = { title: "Inventario" };

export default function AdminInventoryPage() {
  return (
    <ComingSoon
      compact
      title="Inventario"
      description="Acá vas a controlar el stock disponible, reservado y vendido."
      back={{ label: "Volver al panel", href: routes.admin }}
    />
  );
}
