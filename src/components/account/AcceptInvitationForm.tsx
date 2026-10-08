"use client";

import { useActionState } from "react";
import { InvalidLink } from "./RecoveryForms";
import { routes } from "@/config/routes";
import { Notice } from "@/components/ui/Notice";
import { MIN_PASSWORD_LENGTH } from "@/domain/auth";
import type { AcceptInvitationState } from "@/server/actions/staff-invitations";
import { Field, SubmitButton, inputClass } from "./fields";

export function AcceptInvitationForm({ action, token, email }: { action: (p: AcceptInvitationState, f: FormData) => Promise<AcceptInvitationState>; token: string; email: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  const errors = state?.errors ?? {};
  if (state?.invalidLink) return <InvalidLink requestHref={routes.home} label="Ir al inicio" message="Esta invitación ya no es válida, venció o ya se usó. Pedile a quien administra la tienda que te envíe una nueva." />;
  return (
    <form action={formAction} className="space-y-5">
      {state?.message && <Notice tone="error">{state.message}</Notice>}
      <input type="hidden" name="token" value={token} />
      <Field label="Correo">
        <input value={email} readOnly className={`${inputClass} bg-celeste/30`} aria-readonly="true" />
      </Field>
      <Field label="Tu nombre" error={errors.name}>
        <input name="name" autoComplete="name" required maxLength={120} className={inputClass} />
      </Field>
      <Field label="Contraseña" error={errors.password} hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}>
        <input name="password" type="password" autoComplete="new-password" required className={inputClass} />
      </Field>
      <Field label="Repetir contraseña" error={errors.passwordConfirm}>
        <input name="passwordConfirm" type="password" autoComplete="new-password" required className={inputClass} />
      </Field>
      <SubmitButton pending={pending} pendingLabel="Creando acceso…">Aceptar invitación</SubmitButton>
    </form>
  );
}
