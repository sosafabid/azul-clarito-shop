import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { routes } from "@/config/routes";

export const metadata: Metadata = {
  title: "Producto",
  robots: { index: false, follow: false },
};

// Un slug válido son minúsculas, números y guiones. Cualquier otra cosa es 404.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) notFound();

  // Fase siguiente: buscar el producto ACTIVO por slug usando `publicProductColumns`
  // (src/server/services/catalog/public.ts) y llamar a notFound() si no existe.
  return (
    <ComingSoon
      title="Ficha de producto"
      description="Muy pronto vas a poder conocer cada pieza con todos sus detalles."
      back={{ label: "Volver a la tienda", href: routes.shop }}
    />
  );
}
