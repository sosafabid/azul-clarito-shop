"use client";

import { useActionState } from "react";
import { Notice } from "@/components/ui/Notice";
import { MIN_PASSWORD_LENGTH } from "@/domain/auth";
import type { AccountFormState } from "@/server/actions/account";
import { Field, SubmitButton, inputClass } from "./fields";

type Action = (previous: AccountFormState, formData: FormData) => Promise<AccountFormState>;

function Feedback({ state }: { state: AccountFormState }) {
  if (!state?.message) return null;
  return <Notice tone={state.ok ? "success" : "error"}>{state.message}</Notice>;
}

export function ProfileForm({ action, initial, email }: { action: Action; initial: { name: string; phone: string }; email: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  const errors = state?.errors ?? {};
  return (
    <form action={formAction} className="space-y-5">
      <Feedback state={state} />
      <Field label="Correo" hint="Es tu usuario para ingresar. Para cambiarlo, escribinos.">
        <input value={email} readOnly disabled className={`${inputClass} bg-celeste/20`} />
      </Field>
      <Field label="Nombre completo" error={errors.name}>
        <input name="name" defaultValue={initial.name} autoComplete="name" required maxLength={100} className={inputClass} />
      </Field>
      <Field label="Teléfono (opcional)" error={errors.phone}>
        <input name="phone" type="tel" defaultValue={initial.phone} autoComplete="tel" className={inputClass} />
      </Field>
      <SubmitButton pending={pending} pendingLabel="Guardando…">
        Guardar datos
      </SubmitButton>
    </form>
  );
}

export function MarketingForm({ action, granted }: { action: Action; granted: boolean }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-4">
      <Feedback state={state} />
      <label className="flex items-start gap-3 text-sm leading-relaxed text-ink">
        <input type="checkbox" name="marketing" defaultChecked={granted} className="mt-1 size-5 shrink-0 accent-navy" />
        <span>Quiero recibir novedades, lanzamientos y promociones de Azul Clarito.</span>
      </label>
      <SubmitButton pending={pending} pendingLabel="Guardando…">
        Guardar preferencia
      </SubmitButton>
    </form>
  );
}

export function PasswordForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, null);
  const errors = state?.errors ?? {};
  return (
    <form action={formAction} className="space-y-5">
      <Feedback state={state} />
      <Field label="Contraseña actual" error={errors.currentPassword}>
        <input name="currentPassword" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Contraseña nueva" error={errors.newPassword} hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}>
          <input name="newPassword" type="password" autoComplete="new-password" required className={inputClass} />
        </Field>
        <Field label="Repetir contraseña nueva" error={errors.newPasswordConfirm}>
          <input name="newPasswordConfirm" type="password" autoComplete="new-password" required className={inputClass} />
        </Field>
      </div>
      <SubmitButton pending={pending} pendingLabel="Actualizando…">
        Cambiar contraseña
      </SubmitButton>
    </form>
  );
}

export function DeleteAccountForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, null);
  const errors = state?.errors ?? {};
  return (
    <form action={formAction} className="space-y-5">
      <Feedback state={state} />
      <label className="flex items-start gap-3 text-sm font-semibold text-navy">
        <input type="checkbox" name="understand" className="mt-1 size-5 shrink-0 accent-coral" />
        Entiendo que mi cuenta, mis datos y mis consentimientos se borrarán de forma definitiva y que no se puede deshacer.
      </label>
      <Field label="Para confirmar, ingresá tu contraseña" error={errors.password}>
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      <SubmitButton pending={pending} pendingLabel="Eliminando…" tone="coral">
        Eliminar mi cuenta definitivamente
      </SubmitButton>
    </form>
  );
}
