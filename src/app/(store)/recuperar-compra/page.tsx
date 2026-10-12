import type { Metadata } from "next";
import Link from "next/link";
import { RecoverPurchaseForm } from "@/components/checkout/RecoverPurchaseForm";
import { Container } from "@/components/ui/Container";
import { routes } from "@/config/routes";

export const metadata: Metadata = { title: "Recuperar mi compra", robots: { index: false, follow: false } };

export default function RecoverPurchasePage() {
  return (
    <section className="bg-paper py-12 sm:py-16">
      <Container size="narrow">
        <h1 className="text-4xl font-bold">Recuperar mi compra</h1>
        <p className="mt-3 text-ink/75">
          ¿Venció el enlace de descarga de tu libro digital? Escribí el correo y el número de tu pedido y te enviamos enlaces nuevos al correo de la compra. Solo funciona con pedidos ya pagados.
        </p>
        <div className="mt-8">
          <RecoverPurchaseForm />
        </div>
        <Link href={routes.shop} className="mt-8 inline-block text-sm font-semibold text-navy underline underline-offset-4">Volver a la tienda</Link>
      </Container>
    </section>
  );
}
