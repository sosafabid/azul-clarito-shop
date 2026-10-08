import type { Metadata } from "next";
import { InvalidLink, ResetPasswordForm } from "@/components/account/RecoveryForms";
import { Container } from "@/components/ui/Container";
import { getDb, isDatabaseConfigured } from "@/db";
import { resetPasswordAction } from "@/server/actions/recovery";
import { isResetTokenValid } from "@/server/services/auth/recovery";

export const metadata: Metadata = { title: "Restablecer contraseña", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token: rawToken } = await searchParams;
  const token = typeof rawToken === "string" ? rawToken : "";
  // Solo MIRA el enlace (no lo consume): el token se gasta al guardar la contraseña nueva.
  const valid = token !== "" && isDatabaseConfigured() && (await isResetTokenValid(getDb(), token));

  return (
    <section className="bg-gradient-to-b from-celeste/40 to-paper py-14 sm:py-20">
      <Container size="narrow" className="max-w-md">
        <h1 className="text-4xl font-bold">Restablecer contraseña</h1>
        {valid && <p className="mt-2 text-ink/70">Elegí una contraseña nueva para tu cuenta. Al guardarla cerramos todas tus sesiones abiertas.</p>}
        <div className="mt-8 rounded-3xl border border-celeste bg-paper p-6 shadow-soft sm:p-8">
          {valid ? <ResetPasswordForm action={resetPasswordAction} token={token} /> : <InvalidLink />}
        </div>
      </Container>
    </section>
  );
}
