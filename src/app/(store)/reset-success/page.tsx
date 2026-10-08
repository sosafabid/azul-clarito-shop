import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/Notice";
import { routes } from "@/config/routes";

export const metadata: Metadata = { title: "Contraseña actualizada", robots: { index: false, follow: false } };

export default function ResetSuccessPage() {
  return (
    <section className="bg-gradient-to-b from-celeste/40 to-paper py-14 sm:py-20">
      <Container size="narrow" className="max-w-md">
        <h1 className="text-4xl font-bold">Contraseña actualizada</h1>
        <div className="mt-8 space-y-6 rounded-3xl border border-celeste bg-paper p-6 shadow-soft sm:p-8">
          <Notice tone="success">Tu contraseña fue actualizada correctamente.</Notice>
          <Link
            href={routes.accountLogin}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-navy px-8 py-3 font-display font-bold text-paper transition-colors hover:bg-ink"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      </Container>
    </section>
  );
}
