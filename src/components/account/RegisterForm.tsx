"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Notice } from "@/components/ui/Notice";
import { routes } from "@/config/routes";
import { MIN_PASSWORD_LENGTH } from "@/domain/auth";
import type { RegisterState } from "@/server/actions/auth";
import { Field, SubmitButton, inputClass } from "./fields";

const link = "font-semibold text-navy underline underline-offset-4";

export function RegisterForm({
  action,
  versions,
}: {
  action: (previous: RegisterState, formData: FormData) => Promise<RegisterState>;
  versions: { terms: string; privacy: string };
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.message && !errors.email && <Notice tone="error">{state.message}</Notice>}

      {/* Campo trampa para bots: las personas no lo ven (los lectores de pantalla tampoco). */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          No completar este campo
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Field label="Nombre completo *" error={errors.name}>
        <input name="name" autoComplete="name" required maxLength={100} className={inputClass} />
      </Field>
      <Field label="Correo *" error={errors.email}>
        <input name="email" type="email" autoComplete="email" required className={inputClass} />
      </Field>
      <Field label="Teléfono (opcional)" error={errors.phone} hint="Lo usamos solo para coordinar entregas de tus pedidos.">
        <input name="phone" type="tel" autoComplete="tel" className={inputClass} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Contraseña *" error={errors.password} hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}>
          <input name="password" type="password" autoComplete="new-password" required className={inputClass} />
        </Field>
        <Field label="Repetir contraseña *" error={errors.passwordConfirm}>
          <input name="passwordConfirm" type="password" autoComplete="new-password" required className={inputClass} />
        </Field>
      </div>

      <fieldset className="space-y-4 rounded-2xl border border-celeste bg-celeste/20 p-4 sm:p-5">
        <legend className="px-2 font-display text-sm font-bold text-navy">Consentimientos</legend>

        <div>
          <label className="flex items-start gap-3 text-sm leading-relaxed text-ink">
            <input type="checkbox" name="acceptTerms" className="mt-1 size-5 shrink-0 accent-navy" aria-describedby="err-terms" />
            <span>
              Soy mayor de 18 años y acepto los{" "}
              <Link href={routes.terms} target="_blank" rel="noopener" className={link}>
                Términos y condiciones
              </Link>{" "}
              (versión {versions.terms}). <strong>*</strong>
            </span>
          </label>
          {errors.acceptTerms && <p id="err-terms" role="alert" className="mt-1 text-xs font-semibold text-coral">{errors.acceptTerms}</p>}
        </div>

        <div>
          <label className="flex items-start gap-3 text-sm leading-relaxed text-ink">
            <input type="checkbox" name="acceptPrivacy" className="mt-1 size-5 shrink-0 accent-navy" aria-describedby="err-privacy" />
            <span>
              Autorizo el tratamiento de mis datos personales para crear y administrar mi cuenta y gestionar mis pedidos, según la{" "}
              <Link href={routes.privacy} target="_blank" rel="noopener" className={link}>
                Política de Privacidad
              </Link>{" "}
              (versión {versions.privacy}). <strong>*</strong>
            </span>
          </label>
          {errors.acceptPrivacy && <p id="err-privacy" role="alert" className="mt-1 text-xs font-semibold text-coral">{errors.acceptPrivacy}</p>}
        </div>

        <label className="flex items-start gap-3 text-sm leading-relaxed text-ink">
          <input type="checkbox" name="marketing" className="mt-1 size-5 shrink-0 accent-navy" />
          <span>
            <strong>(Opcional)</strong> Quiero recibir novedades, lanzamientos y promociones de Azul Clarito. Puedo retirar este permiso cuando quiera desde mi
            cuenta; no es necesario para comprar.
          </span>
        </label>
      </fieldset>

      <SubmitButton pending={pending} pendingLabel="Creando tu cuenta…">
        Crear mi cuenta
      </SubmitButton>
      <p className="text-sm text-ink/70">
        ¿Ya tenés cuenta?{" "}
        <Link href={routes.accountLogin} className={link}>
          Ingresar
        </Link>
      </p>
    </form>
  );
}
