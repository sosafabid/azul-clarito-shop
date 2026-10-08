import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/account/RecoveryForms";
import { Container } from "@/components/ui/Container";
import { forgotPasswordAction } from "@/server/actions/recovery";

export const metadata: Metadata = { title: "Olvidé mi contraseña", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <section className="bg-gradient-to-b from-celeste/40 to-paper py-14 sm:py-20">
      <Container size="narrow" className="max-w-md">
        <h1 className="text-4xl font-bold">¿Olvidaste tu contraseña?</h1>
        <p className="mt-2 text-ink/70">Escribí tu correo y te enviamos un enlace para elegir una nueva.</p>
        <div className="mt-8 rounded-3xl border border-celeste bg-paper p-6 shadow-soft sm:p-8">
          <ForgotPasswordForm action={forgotPasswordAction} />
        </div>
      </Container>
    </section>
  );
}
