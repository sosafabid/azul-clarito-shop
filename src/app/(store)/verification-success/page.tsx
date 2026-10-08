import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/Notice";
import { routes } from "@/config/routes";

export const metadata: Metadata = { title: "Correo verificado", robots: { index: false, follow: false } };

export default function VerificationSuccessPage() {
  return (
    <section className="bg-gradient-to-b from-celeste/40 to-paper py-14 sm:py-20">
      <Container size="narrow" className="max-w-md">
        <h1 className="text-4xl font-bold">¡Listo!</h1>
        <div className="mt-8 space-y-6 rounded-3xl border border-celeste bg-paper p-6 shadow-soft sm:p-8">
          <Notice tone="success">Tu correo fue verificado correctamente.</Notice>
          <Link
            href={routes.account}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-navy px-8 py-3 font-display font-bold text-paper transition-colors hover:bg-ink"
          >
            Ir a mi cuenta
          </Link>
        </div>
      </Container>
    </section>
  );
}
