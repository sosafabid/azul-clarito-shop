"use client";

import { useActionState } from "react";
import { cartLineAction } from "@/server/actions/cart";
import { safeCartAction } from "./safe-action";

const stepper = "size-11 text-xl font-bold text-navy hover:bg-celeste/50 disabled:cursor-not-allowed disabled:opacity-40";
const wrapped = safeCartAction(cartLineAction);

/**
 * Cantidad y eliminar de UNA línea. Es un formulario real (funciona aun sin JavaScript):
 * el botón presionado decide la nueva cantidad. Mientras hay una operación en curso todos
 * los botones quedan bloqueados (evita dobles operaciones por doble clic). El servidor
 * vuelve a validar stock y disponibilidad en cada cambio.
 */
export function CartLineControls({
  lineId,
  name,
  quantity,
  maxQuantity,
  status,
  availableNow,
}: {
  lineId: string;
  name: string;
  quantity: number;
  maxQuantity: number;
  status: "ok" | "insufficient" | "unavailable";
  availableNow: number | null;
}) {
  const [state, formAction, pending] = useActionState(wrapped, null);
  // Solo se muestra un aviso cuando hay algo que decir (límite de stock, no disponible, conexión…).
  const message = state && (!state.ok || state.message !== "Cantidad actualizada.") ? state : null;

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="lineId" value={lineId} />
      <div className="flex flex-wrap items-center gap-3">
        {status !== "unavailable" && (
          <div className="inline-flex items-center rounded-full border-2 border-celeste" role="group" aria-label={`Cantidad de ${name}`}>
            <button type="submit" name="quantity" value={quantity - 1} aria-label="Una unidad menos" disabled={pending || quantity <= 1} className={`${stepper} rounded-l-full`}>
              −
            </button>
            <span aria-live="polite" className="w-10 text-center font-display text-lg font-bold text-navy">
              {quantity}
            </span>
            <button
              type="submit"
              name="quantity"
              value={quantity + 1}
              aria-label="Una unidad más"
              disabled={pending || quantity >= maxQuantity || status === "insufficient"}
              className={`${stepper} rounded-r-full`}
            >
              +
            </button>
          </div>
        )}
        {status === "insufficient" && availableNow !== null && (
          <button
            type="submit"
            name="quantity"
            value={availableNow}
            disabled={pending}
            className="inline-flex min-h-11 items-center rounded-full bg-navy px-5 py-2 font-display text-sm font-bold text-paper hover:bg-ink disabled:opacity-60"
          >
            Ajustar a {availableNow}
          </button>
        )}
        <button
          type="submit"
          name="remove"
          value="1"
          disabled={pending}
          aria-label={`Eliminar ${name} del carrito`}
          className="inline-flex min-h-11 items-center rounded-full border-2 border-coral px-4 py-2 font-display text-sm font-bold text-navy hover:bg-coral/15 disabled:opacity-60"
        >
          {pending ? "…" : "Eliminar"}
        </button>
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-sm font-semibold text-coral">
        {message?.message}
      </p>
    </form>
  );
}
