import { VariantForm } from "@/components/admin/VariantForm";
import { formatMoney, toCurrency } from "@/domain/money";
import { addVariantAction, deleteVariantAction, toggleVariantAction, updateVariantAction } from "@/server/actions/product-variants";
import type { AdminVariant } from "@/server/services/catalog/admin-variants";

const smallButton =
  "inline-flex min-h-9 items-center rounded-full border-2 border-navy px-3 py-1 font-display text-xs font-bold text-navy hover:bg-navy hover:text-paper";

const optionsToText = (options: Record<string, string>) => Object.entries(options).map(([k, v]) => `${k}: ${v}`).join("\n");
const plain = (amount: number | null, currency: string) => (amount === null ? "" : currency === "USD" ? (amount / 100).toFixed(2) : String(amount));

/** Variantes del producto (talla, color, diseño…). El stock se gestiona en cada una. */
export function VariantsManager({
  productId,
  currency,
  basePrice,
  variants,
  canDelete,
}: {
  productId: string;
  currency: string;
  basePrice: number;
  variants: AdminVariant[];
  canDelete: boolean;
}) {
  const code = toCurrency(currency);
  return (
    <section id="variantes" className="scroll-mt-24 space-y-5 rounded-3xl border border-celeste bg-paper p-5 sm:p-7">
      <div>
        <h2 className="text-xl font-bold">Variantes</h2>
        <p className="mt-1 text-sm text-ink/70">
          Opcional. Un producto sin variantes se vende tal cual. Con variantes, cada una tiene su SKU y su stock (y puede tener precio o costo propio).
        </p>
      </div>

      {variants.length === 0 ? (
        <p className="text-sm text-ink/70">Este producto no tiene variantes.</p>
      ) : (
        <ul className="space-y-3">
          {variants.map((variant) => (
            <li key={variant.id} className="rounded-2xl border border-celeste p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-base font-bold text-navy">
                    {variant.name || variant.sku}{" "}
                    {!variant.isActive && <span className="rounded-full bg-blush/45 px-2 py-0.5 text-xs">Inactiva</span>}
                  </p>
                  <p className="text-xs text-ink/65">
                    {variant.sku} · {formatMoney(variant.price ?? basePrice, code)}
                    {variant.price === null ? " (del producto)" : ""} · Disp. {variant.availableStock} · Res. {variant.reservedStock} · Vend. {variant.soldStock}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={toggleVariantAction.bind(null, productId, variant.id, !variant.isActive)}>
                    <button type="submit" className={smallButton}>{variant.isActive ? "Desactivar" : "Activar"}</button>
                  </form>
                  {canDelete && (
                    <form action={deleteVariantAction.bind(null, productId, variant.id)}>
                      <button type="submit" className="inline-flex min-h-9 items-center rounded-full border-2 border-coral px-3 py-1 font-display text-xs font-bold text-navy hover:bg-coral/15">
                        Eliminar
                      </button>
                    </form>
                  )}
                </div>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer font-display text-sm font-bold text-navy underline underline-offset-4">Editar</summary>
                <div className="mt-3">
                  <VariantForm
                    action={updateVariantAction.bind(null, productId, variant.id)}
                    expectedAvailableStock={variant.availableStock}
                    submitLabel="Guardar variante"
                    currencyHint={currency}
                    initial={{
                      name: variant.name ?? "",
                      sku: variant.sku,
                      options: optionsToText(variant.options),
                      price: plain(variant.price, currency),
                      cost: plain(variant.cost, currency),
                      availableStock: String(variant.availableStock),
                      isActive: variant.isActive,
                    }}
                  />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <details className="rounded-2xl bg-celeste/25 p-4" open={variants.length === 0 ? false : undefined}>
        <summary className="cursor-pointer font-display text-base font-bold text-navy">+ Agregar variante</summary>
        <div className="mt-4">
          <VariantForm
            action={addVariantAction.bind(null, productId)}
            submitLabel="Agregar variante"
            currencyHint={currency}
            initial={{ name: "", sku: "", options: "", price: "", cost: "", availableStock: "0", isActive: true }}
          />
        </div>
      </details>
    </section>
  );
}
