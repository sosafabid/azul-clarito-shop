"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Notice } from "@/components/ui/Notice";
import { routes } from "@/config/routes";
import type { LoginState } from "@/server/actions/auth";
import { Field, SubmitButton, inputClass } from "./fields";

export function CustomerLoginForm({ action }: { action: (previous: LoginState, formData: FormData) => Promise<LoginState> }) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-5">
      {state?.message && <Notice tone="error">{state.message}</Notice>}
      <Field label="Correo">
        <input name="email" type="email" autoComplete="username" required className={inputClass} />
      </Field>
      <Field label="Contraseña">
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      <SubmitButton pending={pending} pendingLabel="Ingresando…">
        Ingresar
      </SubmitButton>
      <p className="text-sm text-ink/70">
        ¿Todavía no tenés cuenta?{" "}
        <Link href={routes.accountRegister} className="font-semibold text-navy underline underline-offset-4">
          Crear una cuenta
        </Link>
      </p>
    </form>
  );
}
