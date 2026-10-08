import type { Metadata } from "next";
import { AcceptInvitationForm } from "@/components/account/AcceptInvitationForm";
import { InvalidLink } from "@/components/account/RecoveryForms";
import { Container } from "@/components/ui/Container";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { acceptInvitationAction } from "@/server/actions/staff-invitations";
import { peekInvitation } from "@/server/services/users/invitations";

export const metadata: Metadata = { title: "Invitación al equipo", robots: { index: false, follow: false } };

export default async function StaffInvitationPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token: rawToken } = await searchParams;
  const token = typeof rawToken === "string" ? rawToken : "";
  // Solo MIRA la invitación (no la consume): se gasta al crear la contraseña.
  const invitation = token !== "" && isDatabaseConfigured() ? await peekInvitation(getDb(), token) : null;

  return (
    <section className="bg-gradient-to-b from-celeste/40 to-paper py-14 sm:py-20">
      <Container size="narrow" className="max-w-md">
        <h1 className="text-4xl font-bold">Invitación al equipo</h1>
        {invitation && <p className="mt-2 text-ink/70">Creá tu contraseña para activar tu acceso al panel de Azul Clarito.</p>}
        <div className="mt-8 rounded-3xl border border-celeste bg-paper p-6 shadow-soft sm:p-8">
          {invitation ? (
            <AcceptInvitationForm action={acceptInvitationAction} token={token} email={invitation.email} />
          ) : (
            <InvalidLink requestHref={routes.home} label="Ir al inicio" message="Esta invitación ya no es válida, venció o ya se usó. Pedile a quien administra la tienda que te envíe una nueva." />
          )}
        </div>
      </Container>
    </section>
  );
}
