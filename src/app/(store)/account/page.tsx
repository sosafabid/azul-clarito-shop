import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteAccountForm, MarketingForm, PasswordForm, ProfileForm } from "@/components/account/AccountForms";
import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/Notice";
import { routes } from "@/config/routes";
import { getDb } from "@/db";
import { CONSENT_LABELS, type ConsentType } from "@/domain/consent";
import { isStaffRole } from "@/domain/roles";
import { changePasswordAction, deleteAccountAction, setMarketingAction, updateProfileAction } from "@/server/actions/account";
import { customerLogoutAction } from "@/server/actions/auth";
import { requireUser } from "@/server/auth";
import { getAccountOverview } from "@/server/services/accounts";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false, follow: false } };

const dateFormat = new Intl.DateTimeFormat("es-CR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Costa_Rica" });
const card = "rounded-3xl border border-celeste bg-paper p-6 sm:p-8";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ bienvenida?: string }> }) {
  const session = await requireUser();
  const overview = await getAccountOverview(getDb(), session.userId);
  if (!overview) redirect(routes.accountLogin);
  const { bienvenida } = await searchParams;
  const staff = isStaffRole(overview.role);

  return (
    <section className="bg-paper py-12 sm:py-16">
      <Container size="narrow" className="max-w-3xl space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">Mi cuenta</h1>
            <p className="mt-1 text-ink/70">{overview.name ?? overview.email}</p>
          </div>
          <form action={customerLogoutAction}>
            <button type="submit" className="inline-flex min-h-11 items-center rounded-full border-2 border-navy px-6 py-2 font-display text-sm font-bold text-navy hover:bg-navy hover:text-paper">
              Cerrar sesión
            </button>
          </form>
        </div>

        {bienvenida && <Notice tone="success">¡Bienvenida/o a Azul Clarito! Tu cuenta ya está creada.</Notice>}
        {staff && (
          <Notice>
            Tu cuenta es del equipo. Podés entrar al{" "}
            <Link href={routes.admin} className="font-semibold underline underline-offset-4">
              panel de administración
            </Link>
            .
          </Notice>
        )}

        <div className={card}>
          <h2 className="text-2xl font-bold">Mis datos</h2>
          <div className="mt-5">
            <ProfileForm action={updateProfileAction} email={overview.email} initial={{ name: overview.name ?? "", phone: overview.phone ?? "" }} />
          </div>
          <p className="mt-4 text-xs text-ink/60">Cuenta creada el {dateFormat.format(overview.createdAt)}. Todavía no verificamos los correos: lo haremos cuando activemos los emails de la tienda.</p>
        </div>

        <div className={card}>
          <h2 className="text-2xl font-bold">Mis consentimientos</h2>
          <p className="mt-2 text-sm text-ink/70">Esto es lo que aceptaste y cuándo. Podés cambiar el permiso de comunicaciones comerciales en cualquier momento.</p>
          <ul className="mt-5 space-y-3 text-sm">
            {(["TERMS", "PRIVACY", "MARKETING"] as ConsentType[]).map((type) => {
              const current = overview.consents[type];
              return (
                <li key={type} className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl bg-celeste/25 px-4 py-3">
                  <span className="font-semibold text-navy">{CONSENT_LABELS[type]}</span>
                  <span className="text-ink/75">
                    {current ? `${current.granted ? "Aceptado" : "No autorizado"} · versión ${current.version} · ${dateFormat.format(current.at)}` : "Sin registro"}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-6">
            <MarketingForm action={setMarketingAction} granted={overview.consents.MARKETING?.granted ?? false} />
          </div>
          <details className="mt-6">
            <summary className="cursor-pointer font-display text-sm font-bold text-navy underline underline-offset-4">Ver el historial completo</summary>
            <ul className="mt-3 space-y-1.5 text-xs text-ink/75">
              {overview.history.map((event, index) => (
                <li key={index}>
                  {dateFormat.format(event.createdAt)} — {CONSENT_LABELS[event.type]}: {event.granted ? "aceptado" : "retirado / no autorizado"} (versión {event.version})
                </li>
              ))}
            </ul>
          </details>
          <p className="mt-5 text-xs text-ink/60">
            Leé los{" "}
            <Link href={routes.terms} className="font-semibold underline underline-offset-4">Términos y condiciones</Link> y la{" "}
            <Link href={routes.privacy} className="font-semibold underline underline-offset-4">Política de Privacidad</Link>.
          </p>
        </div>

        <div className={card}>
          <h2 className="text-2xl font-bold">Seguridad</h2>
          <p className="mt-2 text-sm text-ink/70">Al cambiar la contraseña cerramos tus otras sesiones abiertas.</p>
          <div className="mt-5">
            <PasswordForm action={changePasswordAction} />
          </div>
        </div>

        <div className={`${card} border-coral/50`}>
          <h2 className="text-2xl font-bold">Eliminar mi cuenta</h2>
          {staff ? (
            <p className="mt-2 text-sm text-ink/75">Las cuentas del equipo no se eliminan desde acá.</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-ink/75">
                Se borran tu cuenta, tus sesiones, direcciones y consentimientos. Los pedidos que hayas hecho se conservan sin vínculo con tu cuenta, por obligaciones legales y
                contables.
              </p>
              <div className="mt-5">
                <DeleteAccountForm action={deleteAccountAction} />
              </div>
            </>
          )}
        </div>
      </Container>
    </section>
  );
}
