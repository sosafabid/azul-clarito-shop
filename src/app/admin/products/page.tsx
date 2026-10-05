import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { routes } from "@/config/routes";

export const metadata: Metadata = { title: "Productos" };

export default function AdminProductsPage() {
  return (
    <ComingSoon
      compact
      title="Productos"
      description="Acá vas a crear y editar el catálogo de productos."
      back={{ label: "Volver al panel", href: routes.admin }}
    />
  );
}
