"use client";

import { useActionState } from "react";
import type { LoginState } from "@/server/actions/auth";
import { Notice } from "./Notice";

const inputClass =
  "w-full rounded-xl border-2 border-celeste bg-paper px-4 py-3 text-ink focus:border-aqua focus:outline-none";

export function LoginForm({ action }: { action: (previous: LoginState, formData: FormData) => Promise<LoginState> }) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-5">
      {state?.message && <Notice tone="error">{state.message}</Notice>}
      <label className="block font-display text-sm font-bold text-navy">
        Correo
        <input name="email" type="email" autoComplete="username" required className={`mt-1.5 ${inputClass}`} />
      </label>
      <label className="block font-display text-sm font-bold text-navy">
        Contraseña
        <input name="password" type="password" autoComplete="current-password" required className={`mt-1.5 ${inputClass}`} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-navy px-8 py-3 font-display font-bold text-paper transition-colors hover:bg-ink disabled:opacity-60"
      >
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
