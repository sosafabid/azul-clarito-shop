"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, SubmitButton, inputClass } from "@/components/account/fields";
import { Notice } from "@/components/ui/Notice";
import { routes } from "@/config/routes";
import { CR_PROVINCES } from "@/domain/shipping";
import { cancelPendingOrderAction, resumePendingOrderAction, startPaymentAction, type CheckoutState } from "@/server/actions/checkout";

/**
 * Datos de la clienta y botón de pago. NO hay ningún campo de tarjeta: el pago ocurre en la página segura de Tilopay.
 * Provincia, cantón y código postal vienen del paso anterior (resumen) como campos ocultos; el total que se vio viaja solo para
 * que el servidor avise si cambió (el monto que se cobra siempre lo recalcula el servidor).
 */
export type CheckoutFormProps = {
  /** shipping = hay productos físicos (dirección de entrega). billing = pedido solo digital (dirección de facturación, sin entrega). */
  mode: "shipping" | "billing";
  province: string;
  city: string;
  postalCode: string;
  seenTotal: number;
  defaults: { name: string; email: string };
};

export function CheckoutForm({ mode, province, city, postalCode, seenTotal, defaults }: CheckoutFormProps) {
  const [state, action, pending] = useActionState(startPaymentAction, null);
  const errors = state?.errors ?? {};
  return (
    <form action={action} className="relative space-y-5 rounded-3xl border border-celeste p-5 sm:p-6">
      <h2 className="font-display text-xl font-bold text-navy">{mode === "billing" ? "Tus datos y la dirección de facturación" : "Tus datos y la dirección exacta"}</h2>
      {mode === "billing" && <p className="text-sm text-ink/70">No enviamos nada físico: la pasarela de pago solo nos pide una dirección de facturación.</p>}
      {state?.message && <Notice tone="error">{state.message}</Notice>}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>No completar<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {mode === "shipping" ? (
        <>
          <input type="hidden" name="province" value={province} />
          <input type="hidden" name="city" value={city} />
          <input type="hidden" name="postalCode" value={postalCode} />
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Provincia" error={errors.province}>
            <select name="province" required defaultValue="" className={inputClass}>
              <option value="" disabled>Elegí tu provincia</option>
              {CR_PROVINCES.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </Field>
          <Field label="Cantón" error={errors.city}><input name="city" required maxLength={80} className={inputClass} /></Field>
          <Field label="Código postal (5 dígitos)" error={errors.postalCode}><input name="postalCode" required inputMode="numeric" pattern="[0-9]{5}" maxLength={5} className={inputClass} /></Field>
        </div>
      )}
      <input type="hidden" name="seenTotal" value={seenTotal} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre y apellido" error={errors.name}><input name="name" autoComplete="name" required maxLength={120} defaultValue={defaults.name} className={inputClass} /></Field>
        <Field label="Correo electrónico" error={errors.email} hint="Acá te enviamos la confirmación."><input name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={defaults.email} className={inputClass} /></Field>
        <Field label="Teléfono" error={errors.phone} hint={mode === "billing" ? "Para contactarte si hay un problema con el pago." : "Para coordinar la entrega."}><input name="phone" type="tel" autoComplete="tel" required maxLength={20} className={inputClass} /></Field>
        <Field label="Distrito" error={errors.district}><input name="district" required maxLength={80} className={inputClass} /></Field>
      </div>
      <Field label={mode === "billing" ? "Dirección de facturación" : "Dirección exacta"} error={errors.line1}><input name="line1" autoComplete="address-line1" required maxLength={200} className={inputClass} /></Field>
      <Field label="Más señas (opcional)" error={errors.line2}><input name="line2" autoComplete="address-line2" maxLength={200} className={inputClass} /></Field>
      <Field label="Nota para el pedido (opcional)"><textarea name="notes" maxLength={500} rows={2} className={inputClass} /></Field>
      <div>
        <label className="flex items-start gap-3 text-sm text-ink">
          <input type="checkbox" name="acceptTerms" required className="mt-1 h-5 w-5 accent-navy" />
          <span>Acepto los <Link href={routes.terms} target="_blank" className="font-semibold text-navy underline underline-offset-4">términos y condiciones</Link> y la <Link href={routes.privacy} target="_blank" className="font-semibold text-navy underline underline-offset-4">política de privacidad</Link>.</span>
        </label>
        {errors.acceptTerms && <p role="alert" className="mt-1 text-xs font-semibold text-coral">{errors.acceptTerms}</p>}
      </div>
      {state?.pendingOrder && <PendingOrderActions />}
      <SubmitButton pending={pending} pendingLabel="Preparando tu pago…">Pagar con tarjeta</SubmitButton>
      <p className="text-xs text-ink/65">Te llevamos a la página segura de Tilopay para ingresar tu tarjeta. Azul Clarito nunca ve ni guarda los datos de tu tarjeta.</p>
    </form>
  );
}

/** Pedido ya creado para este carrito: continuar con su pago o cancelarlo para empezar de nuevo. */
export function PendingOrderPanel({ orderNumber, total }: { orderNumber: string; total: string }) {
  const [resumeState, resume, resuming] = useActionState(async (): Promise<CheckoutState> => resumePendingOrderAction(), null);
  const [cancelState, cancel, cancelling] = useActionState(async (): Promise<CheckoutState> => cancelPendingOrderAction(), null);
  const message = resumeState?.message ?? cancelState?.message;
  return (
    <div className="rounded-3xl border border-sun/60 bg-sun/20 p-5 sm:p-6">
      <h2 className="font-display text-xl font-bold text-navy">Tenés un pedido pendiente de pago</h2>
      <p className="mt-2 text-sm text-ink">Pedido <strong>{orderNumber}</strong> por <strong>{total}</strong>. Tus productos están reservados por un tiempo limitado.</p>
      {message && <Notice tone="warning" className="mt-3">{message}</Notice>}
      <div className="mt-4 flex flex-wrap gap-3">
        <form action={resume}><SubmitButton pending={resuming} pendingLabel="Abriendo el pago…">Continuar con el pago</SubmitButton></form>
        <form action={cancel}><SubmitButton pending={cancelling} pendingLabel="Cancelando…" tone="coral">Cancelar y empezar de nuevo</SubmitButton></form>
      </div>
    </div>
  );
}

function PendingOrderActions() {
  return <p className="text-sm font-semibold text-navy">Recargá la página para continuar con tu pedido pendiente.</p>;
}
