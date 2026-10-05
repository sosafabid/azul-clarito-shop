"use client";

import { useActionState } from "react";
import type { DeleteFormState } from "@/server/actions/products";
import { Notice } from "./Notice";

export function DeleteProductForm({
  action,
  sku,
}: {
  action: (previous: DeleteFormState, formData: FormData) => Promise<DeleteFormState>;
  sku: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-5">
      {state?.message && <Notice tone="error">{state.message}</Notice>}
      <label className="flex items-start gap-3 font-semibold text-navy">
        <input type="checkbox" name="understand" className="mt-1 size-5 accent-coral" />
        Entiendo que se borrará de forma definitiva, junto con sus imágenes, variantes e inventario, y que no se puede deshacer.
      </label>
      <label className="block font-display text-sm font-bold text-navy">
        Para confirmar, escribí el SKU: <code className="rounded bg-celeste/50 px-1.5 py-0.5">{sku}</code>
        <input name="confirmSku" autoComplete="off" className="mt-1.5 w-full rounded-xl border-2 border-celeste bg-paper px-4 py-2.5 text-ink focus:border-coral focus:outline-none" />
      </label>
      <button type="submit" disabled={pending} className="inline-flex min-h-12 items-center rounded-full bg-coral px-8 py-3 font-display font-bold text-navy transition-colors hover:bg-coral/80 disabled:opacity-60">
        {pending ? "Eliminando…" : "Eliminar definitivamente"}
      </button>
    </form>
  );
}
