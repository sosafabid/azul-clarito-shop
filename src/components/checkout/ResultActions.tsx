"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/account/fields";
import { Notice } from "@/components/ui/Notice";
import { cancelOrderByTokenAction, refreshPaymentAction, retryPaymentAction, type ResultActionState } from "@/server/actions/checkout";

type Which = "refresh" | "retry" | "cancel";
const ACTIONS = { refresh: refreshPaymentAction, retry: retryPaymentAction, cancel: cancelOrderByTokenAction } as const;
const LABELS: Record<Which, { idle: string; busy: string; tone: "navy" | "coral" }> = {
  refresh: { idle: "Verificar mi pago", busy: "Consultando…", tone: "navy" },
  retry: { idle: "Reintentar el pago", busy: "Abriendo el pago…", tone: "navy" },
  cancel: { idle: "Cancelar el pedido", busy: "Cancelando…", tone: "coral" },
};

/** Botón de la página de resultado. El token del enlace privado viaja oculto; el servidor lo busca y recalcula todo. */
export function ResultAction({ which, token }: { which: Which; token: string }) {
  const [state, action, pending] = useActionState<ResultActionState, FormData>(ACTIONS[which], null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="t" value={token} />
      <SubmitButton pending={pending} pendingLabel={LABELS[which].busy} tone={LABELS[which].tone}>{LABELS[which].idle}</SubmitButton>
      {state?.message && <Notice tone="warning">{state.message}</Notice>}
    </form>
  );
}
