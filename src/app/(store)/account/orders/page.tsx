import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { routes } from "@/config/routes";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = {
  title: "Mis pedidos",
  robots: { index: false, follow: false },
};

export default async function AccountOrdersPage() {
  await requireUser(); // los pedidos son de cada persona: exige sesión
  return (
    <ComingSoon
      title="Mis pedidos"
      description="Acá vas a poder seguir el estado de cada pedido."
      back={{ label: "Volver a mi cuenta", href: routes.account }}
    />
  );
}
