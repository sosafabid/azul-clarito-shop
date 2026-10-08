import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmEmailForm, InvalidLink, ResendVerificationForm } from "@/components/account/RecoveryForms";
import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/Notice";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { confirmEmailAction, resendVerificationAction } from "@/server/actions/recovery";
import { getSession } from "@/server/auth";
import { peekToken } from "@/server/auth/tokens";
import { getAccountOverview } from "@/server/services/accounts";

export const metadata: Metadata = { title: "Verificar correo", robots: { index: false, follow: false } };

const shell = (children: React.ReactNode, title: string) => (
  <section className="bg-gradient-to-b from-celeste/40 to-paper py-14 sm:py-20">
    <Container size="narrow" className="max-w-md">
      <h1 className="text-4xl font-bold">{title}</h1>
      <div className="mt-8 space-y-6 rounded-3xl border border-celeste bg-paper p-6 shadow-soft sm:p-8">{children}</div>
    </Container>
  </section>
);

/**
 * Dos usos de la misma ruta:
 *  - Con `?token=` (el botón del correo): muestra un botón "Verificar mi correo". La verificación
 *    se hace en el SERVIDOR al presionarlo. Mirar el enlace no gasta el token: así los antivirus y
 *    "vistas previas" de los programas de correo no lo consumen antes de que lo abra la persona.
 *  - Sin token (después de registrarse): "Revisá tu correo para verificar tu cuenta."
 */
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token: rawToken } = await searchParams;
  const token = typeof rawToken === "string" ? rawToken : "";

  if (token !== "") {
    const valid = isDatabaseConfigured() && (await peekToken(getDb(), token, "EMAIL_VERIFICATION")) !== null;
    if (!valid) return shell(<InvalidLink requestHref={routes.verifyEmail} />, "Verificar correo");
    return shell(
      <>
        <p className="text-ink/80">Confirmá que este correo es tuyo para activar tu cuenta de Azul Clarito.</p>
        <ConfirmEmailForm action={confirmEmailAction} token={token} />
      </>,
      "Verificar correo",
    );
  }

  const session = await getSession();
  const overview = session && isDatabaseConfigured() ? await getAccountOverview(getDb(), session.userId) : null;

  if (overview?.emailVerifiedAt) {
    return shell(
      <>
        <Notice tone="success">Tu correo ya está verificado.</Notice>
        <Link href={routes.account} className="font-semibold text-navy underline underline-offset-4">
          Ir a mi cuenta
        </Link>
      </>,
      "Correo verificado",
    );
  }

  return shell(
    <>
      <Notice tone="info">Revisá tu correo para verificar tu cuenta.</Notice>
      <p className="text-sm text-ink/70">
        {overview ? `Enviamos un enlace a ${overview.email}. ` : "Te enviamos un enlace. "}
        Revisá también la carpeta de spam. El enlace vence en 24 horas.
      </p>
      <div>
        <h2 className="mb-3 text-lg font-bold">¿No te llegó?</h2>
        <ResendVerificationForm action={resendVerificationAction} email={overview?.email} />
      </div>
      {overview && (
        <Link href={routes.account} className="inline-block text-sm font-semibold text-navy underline underline-offset-4">
          Ir a mi cuenta
        </Link>
      )}
    </>,
    "Revisá tu correo",
  );
}
