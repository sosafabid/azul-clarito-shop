"use client";

import Link from "next/link";
import { useActionState } from "react";
import { routes } from "@/config/routes";
import { safeCartAction } from "@/components/cart/safe-action";
import { addToCartAction } from "@/server/actions/cart";

const safeAdd = safeCartAction(addToCartAction);

const button =
  "inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 py-2 font-display text-sm font-bold transition-colors";

/**
 * Botón de la tarjeta del catálogo:
 *  - producto simple con stock → agrega 1 directamente;
 *  - producto con variantes → lleva a la ficha para elegir la opción (no se puede agregar a medias);
 *  - agotado → deshabilitado.
 */
export function CardAddButton({ productId, slug, hasVariants, soldOut }: { productId: string; slug: string; hasVariants: boolean; soldOut: boolean }) {
  const [state, formAction, pending] = useActionState(safeAdd, null);

  if (soldOut) {
    return (
      <button type="button" disabled className={`${button} cursor-not-allowed bg-navy/30 text-paper`}>
        Agotado
      </button>
    );
  }
  if (hasVariants) {
    return (
      <Link href={routes.product(slug)} className={`${button} border-2 border-navy text-navy hover:bg-navy hover:text-paper`}>
        Elegir opciones
      </Link>
    );
  }
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="quantity" value="1" />
      <button type="submit" disabled={pending} className={`${button} bg-navy text-paper hover:bg-ink disabled:opacity-60`}>
        {pending ? "Agregando…" : "Agregar al carrito"}
      </button>
      <p role="status" aria-live="polite" className="min-h-5 text-center text-xs">
        {state && (
          <span className={state.ok ? "font-semibold text-navy" : "font-semibold text-coral"}>
            {state.ok ? "✓ " : ""}
            {state.message}{" "}
            {state.ok && (
              <Link href={routes.cart} className="underline underline-offset-4">
                Ver carrito
              </Link>
            )}
          </span>
        )}
      </p>
    </form>
  );
}
