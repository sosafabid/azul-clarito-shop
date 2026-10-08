"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Notice } from "@/components/ui/Notice";
import { routes } from "@/config/routes";
import { MIN_PASSWORD_LENGTH } from "@/domain/auth";
import type { RecoveryState } from "@/server/actions/recovery";
import { Field, SubmitButton, inputClass } from "./fields";

type Action = (previous: RecoveryState, formData: FormData) => Promise<RecoveryState>;

/** Campo trampa para bots: una persona real no lo ve ni lo llena. */
function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        No completar
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

export function ForgotPasswordForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="relative space-y-5">
      {state?.message && <Notice tone={state.ok ? "success" : "error"}>{state.message}</Notice>}
      <Honeypot />
      <Field label="Correo electrónico">
        <input name="email" type="email" autoComplete="email" required maxLength={254} className={inputClass} />
      </Field>
      <SubmitButton pending={pending} pendingLabel="Enviando…">
        Enviar enlace
      </SubmitButton>
      <p className="text-sm text-ink/70">
        <Link href={routes.accountLogin} className="font-semibold text-navy underline underline-offset-4">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ action, token }: { action: Action; token: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  const errors = state?.errors ?? {};

  if (state?.invalidLink) {
    return <InvalidLink />;
  }
  return (
    <form action={formAction} className="space-y-5">
      {state?.message && <Notice tone="error">{state.message}</Notice>}
      <input type="hidden" name="token" value={token} />
      <Field label="Contraseña nueva" error={errors.newPassword} hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}>
        <input name="newPassword" type="password" autoComplete="new-password" required className={inputClass} />
      </Field>
      <Field label="Repetir contraseña nueva" error={errors.newPasswordConfirm}>
        <input name="newPasswordConfirm" type="password" autoComplete="new-password" required className={inputClass} />
      </Field>
      <SubmitButton pending={pending} pendingLabel="Guardando…">
        Guardar nueva contraseña
      </SubmitButton>
    </form>
  );
}

/** Aviso de enlace vencido, usado o inválido, con el camino para pedir uno nuevo. */
export function InvalidLink({ requestHref = routes.forgotPassword, label = "Solicitar un nuevo enlace", message = "Este enlace ya no es válido o expiró." }: { requestHref?: string; label?: string; message?: string }) {
  return (
    <div className="space-y-5">
      <Notice tone="error">{message}</Notice>
      <Link
        href={requestHref}
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-navy px-8 py-3 font-display font-bold text-paper transition-colors hover:bg-ink"
      >
        {label}
      </Link>
    </div>
  );
}

/** Botón que confirma el correo (la confirmación la procesa el servidor, no el navegador). */
export function ConfirmEmailForm({ action, token }: { action: Action; token: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  if (state?.invalidLink) return <InvalidLink requestHref={routes.verifyEmail} />;
  return (
    <form action={formAction} className="space-y-5">
      {state?.message && <Notice tone="error">{state.message}</Notice>}
      <input type="hidden" name="token" value={token} />
      <SubmitButton pending={pending} pendingLabel="Verificando…">
        Verificar mi correo
      </SubmitButton>
    </form>
  );
}

export function ResendVerificationForm({ action, email }: { action: Action; email?: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-4">
      {state?.message && <Notice tone={state.ok ? "success" : "error"}>{state.message}</Notice>}
      {!email && (
        <Field label="Correo electrónico">
          <input name="email" type="email" autoComplete="email" required maxLength={254} className={inputClass} />
        </Field>
      )}
      <SubmitButton pending={pending} pendingLabel="Enviando…">
        Reenviar correo de verificación
      </SubmitButton>
    </form>
  );
}
