import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CustomerLoginForm } from "@/components/account/CustomerLoginForm";
import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/Notice";
import { routes } from "@/config/routes";
import { customerLoginAction } from "@/server/actions/auth";
import { getSession } from "@/server/auth";

export const metadata: Metadata = { title: "Ingresar", robots: { index: false, follow: false } };

export default async function AccountLoginPage({ searchParams }: { searchParams: Promise<{ eliminada?: string }> }) {
  if (await getSession()) redirect(routes.account);
  const { eliminada } = await searchParams;

  return (
    <section className="bg-gradient-to-b from-celeste/40 to-paper py-14 sm:py-20">
      <Container size="narrow" className="max-w-md">
        <h1 className="text-4xl font-bold">Ingresar</h1>
        <p className="mt-2 text-ink/70">Accedé a tu cuenta de Azul Clarito Shop.</p>
        {eliminada && (
          <Notice tone="success" className="mt-6">
            Tu cuenta fue eliminada. Gracias por haber sido parte de Azul Clarito.
          </Notice>
        )}
        <div className="mt-8 rounded-3xl border border-celeste bg-paper p-6 shadow-soft sm:p-8">
          <CustomerLoginForm action={customerLoginAction} />
        </div>
      </Container>
    </section>
  );
}
