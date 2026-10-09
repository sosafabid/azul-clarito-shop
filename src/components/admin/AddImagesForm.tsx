"use client";

import { useActionState } from "react";
import type { ProductFormState } from "@/server/actions/products";
import { Notice } from "./Notice";

const inputClass = "w-full rounded-xl border-2 border-celeste bg-paper px-4 py-2.5 text-ink focus:border-aqua focus:outline-none";

/** Agregar imágenes por URL https (los archivos se suben con el selector de arriba). */
export function AddImagesForm({
  action,
  remaining,
}: {
  action: (previous: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  remaining: number;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const errors = state?.errors ?? {};

  if (remaining <= 0) return null;

  return (
    <form action={formAction} className="space-y-3 rounded-2xl bg-celeste/25 p-4">
      <h3 className="font-display text-lg font-bold text-navy">…o agregar por URL</h3>
      {state?.message && <Notice tone="error">{state.message}</Notice>}
      <label className="block text-sm font-bold text-navy">
        URLs https (una por línea)
        <textarea name="imageUrls" rows={2} className={`mt-1.5 ${inputClass}`} placeholder="https://…" />
      </label>
      {errors.imageUrls && <p role="alert" className="text-xs font-semibold text-coral">{errors.imageUrls}</p>}
      <p className="text-xs text-ink/60">Podés agregar hasta {remaining} más.</p>
      <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center rounded-full bg-navy px-6 py-2 font-display text-sm font-bold text-paper hover:bg-ink disabled:opacity-60">
        {pending ? "Agregando…" : "Agregar URL"}
      </button>
    </form>
  );
}
