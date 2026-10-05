import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = {
  title: "Tienda",
  // Sin contenido real todavía: no indexar hasta que exista el catálogo.
  robots: { index: false, follow: true },
};

export default function ShopPage() {
  return (
    <ComingSoon
      title="La tienda abre muy pronto"
      description="Estamos preparando el catálogo de Azul Clarito: objetos, música, libros y piezas especiales."
    />
  );
}
