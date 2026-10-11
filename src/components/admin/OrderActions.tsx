"use client";

import { useActionState } from "react";
import { Notice } from "@/components/ui/Notice";
import { cancelPendingOrderAdminAction, reconcileNowAction, resolvePaymentReviewAction, updateFulfillmentAction, verifyOrderPaymentAction, type OrderActionState } from "@/server/actions/orders";
import { Fld, dangerButton, ghostButton, inputClass, primaryButton } from "./settings-ui";

function Result({ state }: { state: OrderActionState }) {
  return state ? <Notice tone={state.ok ? "success" : "error"} className="mt-3">{state.message}</Notice> : null;
}

export function VerifyPaymentButton({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(verifyOrderPaymentAction.bind(null, orderId), null);
  return (
    <form action={action}>
      <button type="submit" disabled={pending} className={ghostButton}>{pending ? "Consultando…" : "Verificar con Tilopay"}</button>
      <Result state={state} />
    </form>
  );
}

export function CancelPendingButton({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(cancelPendingOrderAdminAction.bind(null, orderId), null);
  return (
    <form action={action}>
      <button type="submit" disabled={pending} className={dangerButton}>{pending ? "Cancelando…" : "Cancelar pedido pendiente"}</button>
      <p className="mt-1 text-[11px] text-ink/60">Antes de cancelar se verifica con Tilopay que no haya un pago aprobado. Libera el stock reservado.</p>
      <Result state={state} />
    </form>
  );
}

export function ReconcileButton() {
  const [state, action, pending] = useActionState(reconcileNowAction, null);
  return (
    <form action={action}>
      <button type="submit" disabled={pending} className={ghostButton}>{pending ? "Revisando…" : "Verificar pagos pendientes"}</button>
      <Result state={state} />
    </form>
  );
}

const LABELS: Record<string, string> = { PREPARING: "Marcar como en preparación", PACKED: "Marcar como empacado", SHIPPED: "Marcar como enviado", DELIVERED: "Marcar como entregado" };

export function FulfillmentForm({ orderId, current, next, carrier, trackingNumber, trackingUrl }: { orderId: string; current: string; next: string; carrier: string; trackingNumber: string; trackingUrl: string }) {
  const [state, action, pending] = useActionState(updateFulfillmentAction.bind(null, orderId), null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="expected" value={current} />
      <input type="hidden" name="next" value={next} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Fld label="Courier"><input name="carrier" defaultValue={carrier} maxLength={80} className={inputClass} /></Fld>
        <Fld label="Número de seguimiento"><input name="trackingNumber" defaultValue={trackingNumber} maxLength={120} className={inputClass} /></Fld>
        <Fld label="Enlace de seguimiento"><input name="trackingUrl" defaultValue={trackingUrl} maxLength={500} placeholder="https://" className={inputClass} /></Fld>
      </div>
      <button type="submit" disabled={pending} className={primaryButton}>{pending ? "Guardando…" : (LABELS[next] ?? "Actualizar")}</button>
      <Result state={state} />
    </form>
  );
}

export function ResolveReviewForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(resolvePaymentReviewAction.bind(null, orderId), null);
  return (
    <form action={action} className="mt-3 space-y-2">
      <Fld label="Nota de resolución (obligatoria)">
        <textarea name="note" required minLength={15} maxLength={500} rows={3} placeholder="Ej.: Reembolsado en el portal de Tilopay (transacción …) y avisada la clienta por correo." className={inputClass} />
      </Fld>
      <button type="submit" disabled={pending} className={ghostButton}>{pending ? "Guardando…" : "Marcar la alerta como resuelta"}</button>
      <p className="text-[11px] text-ink/60">Esto NO cambia el pago ni el pedido: solo deja constancia de lo que hiciste.</p>
      <Result state={state} />
    </form>
  );
}
