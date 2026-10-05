import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { routes } from "@/config/routes";

export const metadata: Metadata = {
  title: "Carrito",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <ComingSoon
      title="Tu carrito"
      description="Acá vas a ver las piezas que elijas antes de finalizar tu compra."
      back={{ label: "Ir a la tienda", href: routes.shop }}
    />
  );
}
