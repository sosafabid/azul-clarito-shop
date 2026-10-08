"use client";

import { useActionState } from "react";
import type { ProductFormState } from "@/server/actions/products";
import { Notice } from "./Notice";

const inputClass = "w-full rounded-xl border-2 border-celeste bg-paper px-3 py-2 text-sm text-ink focus:border-aqua focus:outline-none";
const labelClass = "block font-display text-xs font-bold text-navy";

export type VariantFormValues = {
  name: string;
  sku: string;
  options: string;
  price: string;
  cost: string;
  availableStock: string;
  isActive: boolean;
};

/** Formulario de variante (sirve para agregar y para editar). */
export function VariantForm({
  action,
  initial,
  expectedAvailableStock,
  submitLabel,
  currencyHint,
  caps,
}: {
  action: (previous: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  initial: VariantFormValues;
  expectedAvailableStock?: number;
  submitLabel: string;
  currencyHint: string;
  /** Presentación según permisos (la Server Action vuelve a aplicar la restricción). */
  caps: { costs: boolean; stock: boolean };
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const errors = state?.errors ?? {};

  const field = (label: string, name: keyof VariantFormValues, error?: string, hint?: string) => (
    <label className={labelClass}>
      {label}
      <input name={name} defaultValue={String(initial[name])} className={`mt-1 ${inputClass}`} />
      {hint && !error && <span className="mt-1 block text-[11px] font-normal text-ink/60">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-[11px] font-semibold text-coral">{error}</span>}
    </label>
  );

  return (
    <form action={formAction} className="space-y-3">
      {state?.message && <Notice tone="error">{state.message}</Notice>}
      {expectedAvailableStock !== undefined && <input type="hidden" name="expectedAvailableStock" value={expectedAvailableStock} />}
      <div className="grid gap-3 sm:grid-cols-2">
        {field("Nombre (opcional)", "name", errors.name, "Si lo dejás vacío se arma con las opciones")}
        {field("SKU *", "sku", errors.sku)}
      </div>
      <label className={labelClass}>
        Opciones (una por línea: Clave: valor)
        <textarea name="options" rows={2} defaultValue={initial.options} placeholder={"Talla: M\nColor: Azul"} className={`mt-1 ${inputClass}`} />
        {errors.options && <span role="alert" className="mt-1 block text-[11px] font-semibold text-coral">{errors.options}</span>}
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        {field("Precio propio", "price", errors.price, `Vacío = usa el del producto (${currencyHint})`)}
        {caps.costs && field("Costo propio", "cost", errors.cost, "Vacío = usa el del producto")}
        {caps.stock ? (
          field("Stock disponible", "availableStock", errors.availableStock)
        ) : (
          <p className="self-end rounded-xl bg-celeste/35 px-3 py-2 text-xs text-ink/80">Solo una persona SUPER_ADMIN registra el stock.</p>
        )}
      </div>
      <label className="flex items-center gap-2 font-display text-sm font-bold text-navy">
        <input type="checkbox" name="isActive" defaultChecked={initial.isActive} className="size-4 accent-navy" />
        Activa (visible en la tienda)
      </label>
      <button type="submit" disabled={pending} className="inline-flex min-h-10 items-center rounded-full bg-navy px-5 py-2 font-display text-sm font-bold text-paper hover:bg-ink disabled:opacity-60">
        {pending ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}
