"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { routes } from "@/config/routes";
import { MAX_QUANTITY_PER_LINE } from "@/domain/cart";
import { cn } from "@/lib/utils";
import { safeCartAction } from "@/components/cart/safe-action";
import { addToCartAction } from "@/server/actions/cart";

const safeAdd = safeCartAction(addToCartAction);
import type { ProductAvailability } from "@/types/catalog";
import { AvailabilityBadge } from "./AvailabilityBadge";

export type VariantOption = { id: string; label: string; priceLabel: string | null; availability: ProductAvailability };

/**
 * Agregar al carrito desde la ficha del producto.
 *  - Si el producto tiene variantes, hay que elegir UNA antes de poder agregar.
 *  - Solo se envían ids y cantidad: el precio lo decide el servidor.
 *  - Mientras se agrega, el botón queda bloqueado (evita agregar dos veces con un doble clic).
 */
export function AddToCartForm({ productId, options, soldOut }: { productId: string; options: VariantOption[]; soldOut: boolean }) {
  const [state, formAction, pending] = useActionState(safeAdd, null);
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  // El aviso se oculta al cambiar la elección; un resultado nuevo (objeto nuevo) lo vuelve a mostrar.
  const [dismissed, setDismissed] = useState<typeof state>(null);

  const needsVariant = options.length > 0;
  const missingVariant = needsVariant && variantId === "";
  const disabled = soldOut || pending || missingVariant;
  const feedback = state && state !== dismissed ? state : null;
  const clamp = (value: number) => Math.min(MAX_QUANTITY_PER_LINE, Math.max(1, Number.isFinite(value) ? Math.trunc(value) : 1));

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      <input type="hidden" name="productId" value={productId} />

      {needsVariant && (
        <fieldset>
          <legend className="font-display text-sm font-bold uppercase tracking-[0.14em] text-navy/60">Elegí una opción *</legend>
          <div className="mt-3 grid gap-2">
            {options.map((option) => {
              const unavailable = option.availability === "out_of_stock";
              return (
                <label
                  key={option.id}
                  className={cn(
                    "flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-aqua",
                    variantId === option.id ? "border-navy bg-celeste/40" : "border-celeste hover:border-aqua",
                    unavailable && "cursor-not-allowed opacity-60",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="variantId"
                      value={option.id}
                      checked={variantId === option.id}
                      disabled={unavailable}
                      onChange={() => {
                        setVariantId(option.id);
                        setDismissed(state);
                      }}
                      className="size-5 accent-navy"
                    />
                    <span className="font-display font-bold text-navy">
                      {option.label}
                      {option.priceLabel && <span className="ml-2 font-normal text-ink/70">{option.priceLabel}</span>}
                    </span>
                  </span>
                  <AvailabilityBadge availability={option.availability} />
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="inline-flex items-center rounded-full border-2 border-celeste" role="group" aria-label="Cantidad">
          <button
            type="button"
            aria-label="Una unidad menos"
            disabled={quantity <= 1 || pending}
            onClick={() => {
              setQuantity((q) => clamp(q - 1));
              setDismissed(state);
            }}
            className="size-11 rounded-l-full text-xl font-bold text-navy hover:bg-celeste/50 disabled:opacity-40"
          >
            −
          </button>
          <input
            name="quantity"
            inputMode="numeric"
            aria-label="Cantidad"
            value={quantity}
            onChange={(e) => {
              setQuantity(clamp(Number(e.target.value)));
              setDismissed(state);
            }}
            className="w-12 bg-transparent text-center font-display text-lg font-bold text-navy focus:outline-none"
          />
          <button
            type="button"
            aria-label="Una unidad más"
            disabled={quantity >= MAX_QUANTITY_PER_LINE || pending}
            onClick={() => {
              setQuantity((q) => clamp(q + 1));
              setDismissed(state);
            }}
            className="size-11 rounded-r-full text-xl font-bold text-navy hover:bg-celeste/50 disabled:opacity-40"
          >
            +
          </button>
        </div>

        <button
          type="submit"
          disabled={disabled}
          aria-describedby="add-to-cart-hint"
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-navy px-8 py-3 font-display font-bold text-paper transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:bg-navy/50"
        >
          {soldOut ? "Agotado" : pending ? "Agregando…" : "Agregar al carrito"}
        </button>
      </div>

      <div id="add-to-cart-hint" role="status" aria-live="polite" className="min-h-6 text-sm">
        {missingVariant && !soldOut && <p className="text-ink/60">Elegí una opción para poder agregar al carrito.</p>}
        {feedback && (
          <p className={cn("font-semibold", feedback.ok ? "text-navy" : "text-coral")}>
            {feedback.ok ? "✓ " : ""}
            {feedback.message}{" "}
            {feedback.ok && (
              <Link href={routes.cart} className="underline underline-offset-4">
                Ver carrito
              </Link>
            )}
          </p>
        )}
      </div>
    </form>
  );
}
