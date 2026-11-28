"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { routes } from "@/config/routes";
import { analyticsItem, itemsValue } from "@/domain/analytics";
import { MAX_QUANTITY_PER_LINE } from "@/domain/cart";
import { compareSizes } from "@/domain/sizes";
import { cn } from "@/lib/utils";
import { safeCartAction } from "@/components/cart/safe-action";
import { trackEvent } from "@/lib/analytics/track";
import { addToCartAction } from "@/server/actions/cart";

const safeAdd = safeCartAction(addToCartAction);
import type { ProductAvailability } from "@/types/catalog";
import { AvailabilityBadge } from "./AvailabilityBadge";

export type VariantOption = { id: string; label: string; priceLabel: string | null; availability: ProductAvailability; /** Talla, si la única opción de la variante es la talla. */ size?: string | null };

/**
 * Agregar al carrito desde la ficha del producto.
 *  - Si el producto tiene variantes, hay que elegir UNA antes de poder agregar.
 *  - Solo se envían ids y cantidad: el precio lo decide el servidor.
 *  - Mientras se agrega, el botón queda bloqueado (evita agregar dos veces con un doble clic).
 */
/** Datos para medir `add_to_cart` (precios en unidad mínima, los mismos que muestra la ficha; el servidor igual decide el cobro). */
export type AddToCartTracking = { sku: string; name: string; category: string | null; currency: string; price: number; variants: Record<string, { price: number; label: string }> };

export function AddToCartForm({ productId, options, soldOut, tracking }: { productId: string; options: VariantOption[]; soldOut: boolean; tracking?: AddToCartTracking }) {
  const [state, formAction, pending] = useActionState(safeAdd, null);
  // Lo que se pidió en el momento de enviar (para medir lo agregado aunque la persona cambie la elección después).
  const submitted = useRef<{ variantId: string; quantity: number } | null>(null);
  useEffect(() => {
    if (!tracking || !state?.ok || state.limited || !submitted.current) return;
    const { variantId: sentVariant, quantity: sentQuantity } = submitted.current;
    const variant = sentVariant ? tracking.variants[sentVariant] : undefined;
    const item = analyticsItem({ sku: tracking.sku, name: tracking.name, unitPrice: variant?.price ?? tracking.price, currency: tracking.currency, quantity: sentQuantity, category: tracking.category, variant: variant?.label });
    trackEvent("add_to_cart", { currency: tracking.currency, value: itemsValue([item], tracking.currency), items: [item] });
  }, [state, tracking]);
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  // El aviso se oculta al cambiar la elección; un resultado nuevo (objeto nuevo) lo vuelve a mostrar.
  const [dismissed, setDismissed] = useState<typeof state>(null);

  const needsVariant = options.length > 0;
  // Ropa: si TODAS las variantes son solo una talla, se muestran como botones ordenados (XS → XXL).
  const sizeMode = needsVariant && options.every((option) => Boolean(option.size));
  const sizeOptions = sizeMode ? [...options].sort((a, b) => compareSizes(a.size ?? "", b.size ?? "")) : [];
  const selectedOption = options.find((option) => option.id === variantId) ?? null;
  const missingVariant = needsVariant && variantId === "";
  const disabled = soldOut || pending || missingVariant;
  const feedback = state && state !== dismissed ? state : null;
  const clamp = (value: number) => Math.min(MAX_QUANTITY_PER_LINE, Math.max(1, Number.isFinite(value) ? Math.trunc(value) : 1));

  return (
    <form
      action={(formData: FormData) => {
        submitted.current = { variantId, quantity };
        formAction(formData);
      }}
      className="mt-8 space-y-5"
      noValidate
    >
      <input type="hidden" name="productId" value={productId} />

      {sizeMode && (
        <fieldset>
          <legend className="font-display text-sm font-bold uppercase tracking-[0.14em] text-navy/60">Elegí tu talla *</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {sizeOptions.map((option) => {
              const unavailable = option.availability === "out_of_stock";
              const selected = variantId === option.id;
              return (
                <label
                  key={option.id}
                  className={cn(
                    "relative flex min-h-12 min-w-14 cursor-pointer items-center justify-center rounded-full border-2 px-4 font-display font-bold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-aqua has-[:focus-visible]:ring-offset-2",
                    selected ? "border-navy bg-navy text-paper" : "border-celeste text-navy hover:border-aqua",
                    unavailable && "cursor-not-allowed border-dashed text-ink/40 line-through hover:border-celeste",
                  )}
                >
                  <input
                    type="radio"
                    name="variantId"
                    value={option.id}
                    checked={selected}
                    disabled={unavailable}
                    onChange={() => {
                      setVariantId(option.id);
                      setDismissed(state);
                    }}
                    className="sr-only"
                  />
                  {option.size}
                  {unavailable && <span className="sr-only"> (agotada)</span>}
                </label>
              );
            })}
          </div>
          <div className="mt-3 min-h-7 text-sm" aria-live="polite">
            {selectedOption ? (
              <span className="inline-flex flex-wrap items-center gap-2 text-ink/80">
                Talla <strong className="text-navy">{selectedOption.size}</strong>
                {selectedOption.priceLabel && <span>· {selectedOption.priceLabel}</span>}
                <AvailabilityBadge availability={selectedOption.availability} />
              </span>
            ) : (
              <span className="text-ink/60">Las tallas tachadas están agotadas.</span>
            )}
          </div>
        </fieldset>
      )}

      {needsVariant && !sizeMode && (
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
        {missingVariant && !soldOut && <p className="text-ink/60">{sizeMode ? "Elegí tu talla para poder agregar al carrito." : "Elegí una opción para poder agregar al carrito."}</p>}
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
