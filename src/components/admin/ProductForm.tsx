"use client";

import { useActionState, useState } from "react";
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES, formatMoney, parseMoneyInput, type CurrencyCode } from "@/domain/money";
import { formatPercent, inventoryEconomics, unitEconomics } from "@/domain/product-economics";
import { slugify } from "@/domain/slug";
import type { ProductFormState } from "@/server/actions/products";
import { ImageFileInput, StorageSetupNotice } from "./ImageFileInput";
import { Notice } from "./Notice";

export type ProductFormValues = {
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  status: string;
  currency: string;
  price: string;
  cost: string;
  availableStock: string;
  lowStockThreshold: string;
  categoryId: string;
  newCategory: string;
  collectionId: string;
  newCollection: string;
  imageUrls: string;
  isFeatured: boolean;
  isNew: boolean;
  isLimitedEdition: boolean;
};

type Option = { id: string; name: string };

type ProductFormProps = {
  action: (previous: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  mode: "create" | "edit";
  initial: ProductFormValues;
  /** Solo en edición: stock que la persona ve al abrir (para detectar cambios mientras edita). */
  expectedAvailableStock?: number;
  /** Solo en edición: cantidades que gestiona el sistema (checkout/pedidos). */
  systemStock?: { reserved: number; sold: number };
  categories: Option[];
  collections: Option[];
  /** Si el producto tiene variantes, el stock se gestiona en cada una. */
  hasVariants?: boolean;
  /** Hay almacenamiento externo configurado (permite subir archivos). */
  uploadsEnabled?: boolean;
  /**
   * Qué muestra el formulario según los permisos de quien lo usa (se calculan en el servidor).
   * Es solo presentación: la Server Action vuelve a aplicar la restricción.
   */
  caps: { costs: boolean; stock: boolean; publish: boolean };
};

const inputClass =
  "w-full rounded-xl border-2 border-celeste bg-paper px-4 py-2.5 text-ink placeholder:text-ink/40 focus:border-aqua focus:outline-none";
const labelClass = "mb-1.5 block font-display text-sm font-bold text-navy";

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {children}
      </label>
      {hint && !error && <p className="mt-1 text-xs text-ink/60">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs font-semibold text-coral">
          {error}
        </p>
      )}
    </div>
  );
}

export function ProductForm({ action, mode, initial, expectedAvailableStock, systemStock, categories, collections, hasVariants = false, uploadsEnabled = false, caps }: ProductFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const [values, setValues] = useState<ProductFormValues>(initial);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [confirmLoss, setConfirmLoss] = useState(false);

  const errors = state?.errors ?? {};
  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const currency = (SUPPORTED_CURRENCIES as readonly string[]).includes(values.currency)
    ? (values.currency as CurrencyCode)
    : DEFAULT_CURRENCY;

  // Vista previa de la economía del producto (utilidad BRUTA = precio − costo).
  const price = parseMoneyInput(values.price, currency);
  const cost = values.cost.trim() === "" ? null : parseMoneyInput(values.cost, currency);
  const priceAmount = price.ok ? price.amount : null;
  const costAmount = cost && cost.ok ? cost.amount : null;
  const economics = priceAmount !== null ? unitEconomics(priceAmount, cost === null || cost.ok ? costAmount : null) : null;
  const stockNumber = /^\d+$/.test(values.availableStock) ? Number(values.availableStock) : 0;
  const inventoryPreview =
    priceAmount !== null ? inventoryEconomics({ availableStock: stockNumber, price: priceAmount, cost: costAmount }) : null;

  return (
    <form action={formAction} className="space-y-8">
      {state?.message && <Notice tone="error">{state.message}</Notice>}
      {mode === "edit" && expectedAvailableStock !== undefined && (
        <input type="hidden" name="expectedAvailableStock" value={expectedAvailableStock} />
      )}

      <section className="space-y-5 rounded-3xl border border-celeste bg-paper p-5 sm:p-7">
        <h2 className="text-xl font-bold">Datos del producto</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nombre *" error={errors.name}>
            <input
              name="name"
              value={values.name}
              onChange={(e) => {
                set("name", e.target.value);
                if (!slugTouched) set("slug", slugify(e.target.value));
              }}
              className={inputClass}
              required
            />
          </Field>
          <Field
            label="SKU *"
            error={errors.sku}
            hint="Código interno único. Ej: CAM-AZU-01"
          >
            <input name="sku" value={values.sku} onChange={(e) => set("sku", e.target.value)} className={inputClass} required />
          </Field>
          <Field
            label="Slug (enlace público)"
            error={errors.slug}
            hint={
              mode === "edit"
                ? "Cuidado: si lo cambiás, cambia el enlace público del producto."
                : "Se genera solo desde el nombre. Minúsculas, números y guiones."
            }
          >
            <input
              name="slug"
              value={values.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value);
              }}
              className={inputClass}
            />
          </Field>
          {mode === "create" && !caps.publish ? (
            <p className="self-end rounded-xl bg-celeste/35 px-4 py-3 text-sm text-ink/80">
              El producto nuevo queda <strong>Oculto</strong> hasta que una persona SUPER_ADMIN lo publique.
            </p>
          ) : mode === "create" ? (
            <Field label="Estado inicial" error={errors.status} hint="Un producto Oculto existe en el panel pero no aparece en la tienda.">
              <select name="status" value={values.status} onChange={(e) => set("status", e.target.value)} className={inputClass}>
                <option value="DRAFT">Oculto (no se muestra en la tienda)</option>
                <option value="ACTIVE">Activo (visible en la tienda)</option>
              </select>
            </Field>
          ) : null}
        </div>
        <Field label="Descripción corta" error={errors.shortDescription}>
          <input name="shortDescription" value={values.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Descripción" error={errors.description}>
          <textarea name="description" rows={5} value={values.description} onChange={(e) => set("description", e.target.value)} className={inputClass} />
        </Field>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {(
            [
              ["isFeatured", "Destacado"],
              ["isNew", "Nuevo"],
              ["isLimitedEdition", "Edición limitada"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 font-semibold text-navy">
              <input type="checkbox" name={key} checked={values[key]} onChange={(e) => set(key, e.target.checked)} className="size-5 accent-navy" />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-5 rounded-3xl border border-celeste bg-paper p-5 sm:p-7">
        <h2 className="text-xl font-bold">Clasificación</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Categoría" error={errors.categoryId}>
            <select name="categoryId" value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={inputClass}>
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="…o crear una categoría nueva" error={errors.newCategory} hint="Si escribís un nombre, se usa en lugar de la lista.">
            <input name="newCategory" value={values.newCategory} onChange={(e) => set("newCategory", e.target.value)} className={inputClass} maxLength={60} />
          </Field>
          <Field label="Colección" error={errors.collectionId}>
            <select name="collectionId" value={values.collectionId} onChange={(e) => set("collectionId", e.target.value)} className={inputClass}>
              <option value="">Sin colección</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="…o crear una colección nueva" error={errors.newCollection} hint="Si escribís un nombre, se usa en lugar de la lista.">
            <input name="newCollection" value={values.newCollection} onChange={(e) => set("newCollection", e.target.value)} className={inputClass} maxLength={60} />
          </Field>
        </div>
      </section>

      <section className="space-y-5 rounded-3xl border border-celeste bg-paper p-5 sm:p-7">
        <div>
          <h2 className="text-xl font-bold">{caps.costs ? "Precio y costo" : "Precio"}</h2>
          {caps.costs && (
            <p className="mt-1 text-sm text-ink/70">
              El costo es <strong>privado</strong>: solo lo ve quien tiene permiso, nunca el público. La utilidad bruta no incluye gastos
              operativos, empaque, comisiones ni publicidad.
            </p>
          )}
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Moneda" error={errors.currency}>
            <select name="currency" value={values.currency} onChange={(e) => set("currency", e.target.value)} className={inputClass}>
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Precio de venta *"
            error={errors.price}
            hint={currency === "CRC" ? "Colones enteros: 12000 o 12.000" : "Ej: 12.50"}
          >
            <input name="price" inputMode="decimal" value={values.price} onChange={(e) => set("price", e.target.value)} className={inputClass} required />
          </Field>
          {caps.costs && (
            <Field label="Costo (opcional)" error={errors.cost} hint="Vacío = costo desconocido">
              <input name="cost" inputMode="decimal" value={values.cost} onChange={(e) => set("cost", e.target.value)} className={inputClass} />
            </Field>
          )}
        </div>

        {caps.costs && (
        <div aria-live="polite" className="rounded-2xl bg-celeste/35 p-4">
          {economics === null ? (
            <p className="text-sm text-ink/70">Ingresá el precio para ver la utilidad y el margen.</p>
          ) : !economics.costKnown ? (
            <p className="text-sm text-ink/80">Sin costo: no se puede calcular la utilidad bruta ni el margen.</p>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-ink/60">Utilidad bruta por unidad</dt>
                <dd className="mt-1 font-display text-xl font-bold text-navy">
                  {formatMoney(economics.grossProfitPerUnit ?? 0, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-ink/60">Margen bruto</dt>
                <dd className="mt-1 font-display text-xl font-bold text-navy">{formatPercent(economics.marginPercent)}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-ink/60">Valor del inventario (al costo)</dt>
                <dd className="mt-1 font-display text-xl font-bold text-navy">
                  {inventoryPreview?.inventoryValueAtCost === null || inventoryPreview === null
                    ? "—"
                    : formatMoney(inventoryPreview.inventoryValueAtCost, currency)}
                </dd>
              </div>
            </dl>
          )}
        </div>
        )}

        {caps.costs && economics?.isLoss && (
          <Notice tone="warning">
            <p className="font-bold">⚠️ Margen negativo: el precio es menor que el costo.</p>
            <p className="mt-1">Cada venta se haría con pérdida. Si es intencional, confirmalo para poder guardar.</p>
            <label className="mt-3 flex items-center gap-2 font-semibold">
              <input
                type="checkbox"
                name="confirmLoss"
                checked={confirmLoss}
                onChange={(e) => setConfirmLoss(e.target.checked)}
                className="size-5 accent-navy"
              />
              Entiendo que se venderá con pérdida
            </label>
            {errors.confirmLoss && <p className="mt-2 text-xs font-semibold text-coral">{errors.confirmLoss}</p>}
          </Notice>
        )}
      </section>

      {mode === "create" && (
        <section className="space-y-5 rounded-3xl border border-celeste bg-paper p-5 sm:p-7">
          <div>
            <h2 className="text-xl font-bold">Imágenes</h2>
            <p className="mt-1 text-sm text-ink/70">
              Subí archivos (JPG, PNG, WebP o AVIF, máx. 4 MB cada uno) y/o pegá URLs https. La primera será la principal. También
              podés agregarlas después, desde la ficha del producto.
            </p>
          </div>
          {!uploadsEnabled && <StorageSetupNotice />}
          <Field label="Archivos" error={errors.imageFiles}>
            <ImageFileInput name="imageFiles" disabled={!uploadsEnabled} />
          </Field>
          <Field label="URLs de imágenes (una por línea)" error={errors.imageUrls}>
            <textarea name="imageUrls" rows={3} value={values.imageUrls} onChange={(e) => set("imageUrls", e.target.value)} className={inputClass} placeholder="https://…" />
          </Field>
        </section>
      )}

      <section className="space-y-5 rounded-3xl border border-celeste bg-paper p-5 sm:p-7">
        <h2 className="text-xl font-bold">Inventario</h2>
        {hasVariants ? (
          <Notice>
            Este producto tiene <strong>variantes</strong>: el stock disponible se gestiona en cada una (sección Variantes, más abajo).
          </Notice>
        ) : (
          <div className="grid gap-5 sm:grid-cols-3">
            <Field
              label={mode === "create" ? "Stock inicial" : "Stock disponible"}
              error={errors.availableStock}
              hint={caps.stock ? "Unidades que se pueden vender ahora." : "Solo una persona SUPER_ADMIN registra el stock y sus ajustes."}
            >
              <input
                name={caps.stock ? "availableStock" : undefined}
                inputMode="numeric"
                value={values.availableStock}
                onChange={(e) => set("availableStock", e.target.value)}
                readOnly={!caps.stock}
                className={`${inputClass} ${caps.stock ? "" : "bg-celeste/20"}`}
              />
            </Field>
            <Field label="Avisar con poco stock desde" error={errors.lowStockThreshold} hint="Cantidad que activa la alerta de stock bajo.">
              <input name="lowStockThreshold" inputMode="numeric" value={values.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value)} className={inputClass} />
            </Field>
          </div>
        )}
        {hasVariants && <input type="hidden" name="lowStockThreshold" value={values.lowStockThreshold} />}
        {systemStock && (
          <dl className="grid gap-4 rounded-2xl bg-celeste/35 p-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-ink/60">Reservado</dt>
              <dd className="mt-1 font-display text-xl font-bold text-navy">{systemStock.reserved}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-ink/60">Vendido</dt>
              <dd className="mt-1 font-display text-xl font-bold text-navy">{systemStock.sold}</dd>
            </div>
            <p className="text-xs text-ink/65 sm:col-span-2">
              Reservado y vendido los gestiona el sistema (checkout y pedidos); por eso no se editan a mano.
            </p>
          </dl>
        )}
      </section>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-navy px-8 py-3 font-display font-bold text-paper transition-colors hover:bg-ink disabled:opacity-60"
      >
        {pending ? "Guardando…" : mode === "create" ? "Crear producto" : "Guardar cambios"}
      </button>
    </form>
  );
}
