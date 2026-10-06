import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/account/RegisterForm";
import { Container } from "@/components/ui/Container";
import { legalConfig } from "@/config/legal";
import { routes } from "@/config/routes";
import { registerAction } from "@/server/actions/auth";
import { getSession } from "@/server/auth";

export const metadata: Metadata = { title: "Crear cuenta", robots: { index: false, follow: false } };

export default async function AccountRegisterPage() {
  if (await getSession()) redirect(routes.account);

  return (
    <section className="bg-gradient-to-b from-celeste/40 to-paper py-14 sm:py-20">
      <Container size="narrow" className="max-w-xl">
        <h1 className="text-4xl font-bold">Crear una cuenta</h1>
        <p className="mt-2 text-ink/70">Guardá tus datos y seguí tus pedidos cuando la tienda abra.</p>
        <div className="mt-8 rounded-3xl border border-celeste bg-paper p-6 shadow-soft sm:p-8">
          <RegisterForm action={registerAction} versions={{ terms: legalConfig.termsVersion, privacy: legalConfig.privacyVersion }} />
        </div>
      </Container>
    </section>
  );
}
