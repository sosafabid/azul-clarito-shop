"use client";

import { useActionState } from "react";
import { STANDARD_SIZES } from "@/domain/sizes";
import type { ProductFormState } from "@/server/actions/products";
import { Notice } from "./Notice";

const inputClass = "w-full rounded-xl border-2 border-celeste bg-paper px-3 py-2 text-sm text-ink focus:border-aqua focus:outline-none";
const labelClass = "block font-display text-xs font-bold text-navy";

/** Crear varias tallas de una vez: marcás las que hay y anotás el stock de cada una. */
export function SizesForm({
  action,
  currencyHint,
  caps,
}: {
  action: (previous: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  currencyHint: string;
  caps: { costs: boolean; stock: boolean };
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const errors = state?.errors ?? {};
  return (
    <form action={formAction} className="space-y-4">
      {state?.message && <Notice tone="error">{state.message}</Notice>}
      <label className={labelClass}>
        SKU base *
        <input name="baseSku" placeholder="CAM-TORTUGA" className={`mt-1 max-w-xs ${inputClass}`} />
        <span className="mt-1 block text-[11px] font-normal text-ink/60">A cada talla se le agrega la talla: CAM-TORTUGA-M, CAM-TORTUGA-XL…</span>
        {errors.baseSku && <span role="alert" className="mt-1 block text-[11px] font-semibold text-coral">{errors.baseSku}</span>}
      </label>

      <fieldset>
        <legend className={labelClass}>Tallas que hay {caps.stock ? "y cuántas unidades de cada una" : ""}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {STANDARD_SIZES.map((size) => (
            <div key={size} className="flex items-center gap-2 rounded-xl border-2 border-celeste bg-paper px-3 py-2">
              <input type="checkbox" id={`size_${size}`} name={`size_${size}`} className="size-4 accent-navy" />
              <label htmlFor={`size_${size}`} className="w-9 font-display text-sm font-bold text-navy">{size}</label>
              {caps.stock && <input name={`stock_${size}`} inputMode="numeric" defaultValue="0" aria-label={`Unidades de la talla ${size}`} className="w-full min-w-0 rounded-lg border border-celeste px-2 py-1 text-sm" />}
            </div>
          ))}
        </div>
        {errors.sizes && <span role="alert" className="mt-1 block text-[11px] font-semibold text-coral">{errors.sizes}</span>}
      </fieldset>

      <label className={labelClass}>
        Otras tallas (opcional)
        <input name="extraSizes" placeholder="38:5, 40:3, Única:10" className={`mt-1 ${inputClass}`} />
        <span className="mt-1 block text-[11px] font-normal text-ink/60">Separadas por coma. Formato Talla:unidades (ej. 38:5). Sin unidades = 0.</span>
        {errors.extraSizes && <span role="alert" className="mt-1 block text-[11px] font-semibold text-coral">{errors.extraSizes}</span>}
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Precio propio (opcional)
          <input name="price" className={`mt-1 ${inputClass}`} />
          <span className="mt-1 block text-[11px] font-normal text-ink/60">Vacío = todas usan el precio del producto ({currencyHint})</span>
          {errors.price && <span role="alert" className="mt-1 block text-[11px] font-semibold text-coral">{errors.price}</span>}
        </label>
        {caps.costs && (
          <label className={labelClass}>
            Costo propio (opcional)
            <input name="cost" className={`mt-1 ${inputClass}`} />
            {errors.cost && <span role="alert" className="mt-1 block text-[11px] font-semibold text-coral">{errors.cost}</span>}
          </label>
        )}
      </div>
      {!caps.stock && <p className="rounded-xl bg-celeste/35 px-3 py-2 text-xs text-ink/80">Las tallas se crean con 0 unidades: solo una persona SUPER_ADMIN registra el stock.</p>}

      <label className="flex items-center gap-2 font-display text-sm font-bold text-navy">
        <input type="checkbox" name="isActive" defaultChecked className="size-4 accent-navy" />
        Activas (visibles en la tienda)
      </label>
      <button type="submit" disabled={pending} className="inline-flex min-h-10 items-center rounded-full bg-navy px-5 py-2 font-display text-sm font-bold text-paper hover:bg-ink disabled:opacity-60">
        {pending ? "Creando…" : "Crear tallas"}
      </button>
    </form>
  );
}
