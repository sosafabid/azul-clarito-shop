import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { routes } from "@/config/routes";

export const metadata: Metadata = {
  title: "Finalizar compra",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <ComingSoon
      title="Finalizar compra"
      description="El proceso de compra todavía no está disponible. Estamos trabajando en él."
      back={{ label: "Volver al carrito", href: routes.cart }}
    />
  );
}
