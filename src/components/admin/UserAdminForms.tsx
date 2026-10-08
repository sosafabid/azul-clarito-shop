"use client";

import { useActionState } from "react";
import { Notice } from "./Notice";
import { dangerButton, ghostButton, inputClass, primaryButton } from "./settings-ui";
import type { UserActionState } from "@/server/actions/users";

type Action = (previous: UserActionState, formData: FormData) => Promise<UserActionState>;

function Result({ state }: { state: UserActionState }) {
  if (!state?.message) return null;
  return <Notice tone={state.ok ? "success" : "error"}>{state.message}</Notice>;
}

export function InviteStaffForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-3">
      <Result state={state} />
      <label className="block font-display text-xs font-bold text-navy">
        Correo de la persona a invitar
        <input name="email" type="email" required maxLength={254} autoComplete="off" placeholder="nombre@correo.com" className={`${inputClass} mt-1 font-sans font-normal`} />
      </label>
      <button type="submit" disabled={pending} className={`${primaryButton} disabled:opacity-60`}>
        {pending ? "Enviando…" : "Enviar invitación"}
      </button>
    </form>
  );
}

export function RevokeInvitationForm({ action, invitationId }: { action: Action; invitationId: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="invitationId" value={invitationId} />
      <button type="submit" disabled={pending} className={ghostButton}>
        {pending ? "…" : "Revocar"}
      </button>
      {state?.message && !state.ok && <span role="alert" className="ml-2 text-xs text-coral">{state.message}</span>}
    </form>
  );
}

/** Asignar STAFF a una cuenta CUSTOMER. */
export function AssignStaffForm({ action, userId }: { action: Action; userId: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-3">
      <Result state={state} />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="role" value="STAFF" />
      <p className="text-sm text-ink/80">La persona podrá entrar al panel con los permisos de STAFF (sin costos, impuestos, envíos ni usuarios).</p>
      <button type="submit" disabled={pending} className={`${primaryButton} disabled:opacity-60`}>
        {pending ? "Guardando…" : "Asignar rol STAFF"}
      </button>
    </form>
  );
}

/** Retirar STAFF (volver a CUSTOMER) con confirmación explícita. */
export function RemoveStaffForm({ action, userId }: { action: Action; userId: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-3">
      <Result state={state} />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="role" value="CUSTOMER" />
      <label className="flex items-start gap-2 text-sm text-navy">
        <input type="checkbox" name="confirm" value="yes" required className="mt-1 size-4 accent-coral" />
        Entiendo que esta persona perderá el acceso al panel y se cerrarán sus sesiones. Su cuenta y sus datos se conservan como CUSTOMER.
      </label>
      <button type="submit" disabled={pending} className={`${dangerButton} disabled:opacity-60`}>
        {pending ? "Guardando…" : "Retirar acceso de STAFF"}
      </button>
    </form>
  );
}

export function StaffAccessForm({ action, userId, suspended }: { action: Action; userId: string; suspended: boolean }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-3">
      <Result state={state} />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="intent" value={suspended ? "reactivate" : "suspend"} />
      {!suspended && (
        <label className="flex items-start gap-2 text-sm text-navy">
          <input type="checkbox" name="confirm" value="yes" required className="mt-1 size-4 accent-coral" />
          Entiendo que se bloqueará su ingreso (también a la tienda) y se cerrarán sus sesiones hasta que lo reactives.
        </label>
      )}
      <button type="submit" disabled={pending} className={`${suspended ? primaryButton : dangerButton} disabled:opacity-60`}>
        {pending ? "Guardando…" : suspended ? "Reactivar acceso" : "Suspender acceso"}
      </button>
    </form>
  );
}
