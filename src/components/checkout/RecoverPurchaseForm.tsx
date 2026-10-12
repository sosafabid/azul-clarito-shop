"use client";

import { useActionState } from "react";
import { Field, SubmitButton, inputClass } from "@/components/account/fields";
import { Notice } from "@/components/ui/Notice";
import { requestDownloadRecoveryAction } from "@/server/actions/downloads";

export function RecoverPurchaseForm() {
  const [state, action, pending] = useActionState(requestDownloadRecoveryAction, null);
  const errors = state?.errors ?? {};
  return (
    <form action={action} className="relative space-y-5 rounded-3xl border border-celeste bg-paper p-5 sm:p-6">
      {state?.message && <Notice tone={state.done ? "success" : "warning"}>{state.message}</Notice>}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>No completar<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <Field label="Correo de la compra" error={errors.email} hint="El mismo con el que hiciste el pedido."><input name="email" type="email" autoComplete="email" required maxLength={254} className={inputClass} /></Field>
      <Field label="Número de pedido" error={errors.orderNumber} hint="Está en el correo de confirmación. Ej: AC-2026-000123"><input name="orderNumber" required maxLength={20} placeholder="AC-2026-000123" className={inputClass} /></Field>
      <SubmitButton pending={pending} pendingLabel="Enviando…">Enviarme enlaces nuevos</SubmitButton>
    </form>
  );
}
