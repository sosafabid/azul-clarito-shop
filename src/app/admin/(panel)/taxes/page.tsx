import type { Metadata } from "next";
import { DatabaseNotice } from "@/components/admin/Notice";
import { Notice } from "@/components/ui/Notice";
import { Fld, card, dangerButton, inputClass, primaryButton } from "@/components/admin/settings-ui";
import { getDb, isDatabaseConfigured } from "@/db";
import { can } from "@/domain/permissions";
import { TAX_ROUNDING_LABELS, TAX_ROUNDING_MODES, TAX_TREATMENT_LABELS, TAX_TREATMENTS, formatBps } from "@/domain/tax";
import { addTaxRuleAction, deleteTaxRuleAction, saveTaxRateAction } from "@/server/actions/settings";
import { requirePermission } from "@/server/auth";
import { getTaxSettings } from "@/server/services/settings/tax";

export const metadata: Metadata = { title: "Impuestos" };

export default async function AdminTaxesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const session = await requirePermission("settings:read");
  const canWrite = can(session.role, "settings:write");
  const { saved, error } = await searchParams;
  if (!isDatabaseConfigured()) return <DatabaseNotice />;
  const { rate, rules, categories } = await getTaxSettings(getDb());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Impuestos</h1>
        <p className="mt-1 text-sm text-ink/70">Lo que se configura acá cambia lo que paga cada clienta en el checkout. Los pedidos ya creados no cambian: guardan la tasa que se usó.</p>
      </div>
      {saved && <Notice tone="success">{saved}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {!canWrite && <Notice>Podés ver la configuración. Solo un SUPER_ADMIN puede cambiarla.</Notice>}

      <section className={card}>
        <h2 className="text-xl font-bold">Impuesto de la tienda</h2>
        {!rate ? (
          <p className="mt-2 text-sm text-ink/75">Todavía no hay ningún impuesto configurado, así que <strong>no se cobra ninguno</strong>. La tasa oficial la definís vos; no hay ninguna precargada.</p>
        ) : (
          <p className="mt-2 text-sm text-ink/75">
            Actual: <strong>{rate.name}</strong> · {formatBps(rate.rateBps)} · {rate.pricesIncludeTax ? "precios con impuesto incluido" : "el impuesto se suma al pagar"} ·{" "}
            <strong>{rate.isActive ? "ACTIVO" : "INACTIVO (no se cobra)"}</strong>
          </p>
        )}
        {canWrite && (
          <form action={saveTaxRateAction} className="mt-5 grid gap-4 sm:grid-cols-2">
            <Fld label="Nombre del impuesto"><input name="name" defaultValue={rate?.name ?? ""} maxLength={60} required className={inputClass} /></Fld>
            <Fld label="Porcentaje" hint="Ej. 13 o 13,5. Escribí la tasa oficial que se apruebe para la tienda."><input name="rate" defaultValue={rate ? String(rate.rateBps / 100).replace(".", ",") : ""} inputMode="decimal" required className={inputClass} /></Fld>
            <fieldset className="font-display text-xs font-bold text-navy">
              <legend>¿Los precios publicados ya incluyen el impuesto? *</legend>
              <div className="mt-2 space-y-1 font-sans text-sm font-normal text-ink">
                <label className="flex items-center gap-2"><input type="radio" name="included" value="yes" defaultChecked={rate?.pricesIncludeTax === true} className="accent-navy" /> Sí, ya está incluido en el precio</label>
                <label className="flex items-center gap-2"><input type="radio" name="included" value="no" defaultChecked={rate?.pricesIncludeTax === false} className="accent-navy" /> No, se suma al pagar</label>
              </div>
            </fieldset>
            <Fld label="Redondeo (por línea)">
              <select name="rounding" defaultValue={rate?.rounding ?? "HALF_UP"} className={inputClass}>
                {TAX_ROUNDING_MODES.map((mode) => <option key={mode} value={mode}>{TAX_ROUNDING_LABELS[mode]}</option>)}
              </select>
            </Fld>
            <label className="flex items-center gap-2 font-display text-sm font-bold text-navy sm:col-span-2">
              <input type="checkbox" name="active" defaultChecked={rate?.isActive ?? false} className="size-4 accent-navy" /> Impuesto ACTIVO (se cobra en el checkout)
            </label>
            <div className="sm:col-span-2"><button type="submit" className={primaryButton}>Guardar impuesto</button></div>
          </form>
        )}
      </section>

      <section className={card}>
        <h2 className="text-xl font-bold">A qué productos aplica</h2>
        <p className="mt-1 text-sm text-ink/70">Gana la regla más específica: producto, luego categoría, luego &ldquo;todos&rdquo;. Sin ninguna regla, <strong>nada</strong> paga impuesto.</p>
        {!rate ? <p className="mt-3 text-sm text-ink/70">Guardá primero el impuesto para poder definir reglas.</p> : (
          <>
            {rules.length === 0 ? <p className="mt-3 text-sm text-ink/70">Todavía no hay reglas.</p> : (
              <ul className="mt-4 divide-y divide-celeste/60">
                {rules.map((rule) => (
                  <li key={rule.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <span>
                      <strong className="text-navy">{rule.scope === "ALL" ? "Todos los productos" : rule.scope === "CATEGORY" ? `Categoría: ${rule.categoryName}` : `Producto: ${rule.productSku} · ${rule.productName}`}</strong>
                      {" → "}{TAX_TREATMENT_LABELS[rule.treatment]}
                    </span>
                    {canWrite && <form action={deleteTaxRuleAction.bind(null, rule.id)}><button type="submit" className={dangerButton}>Quitar</button></form>}
                  </li>
                ))}
              </ul>
            )}
            {canWrite && (
              <form action={addTaxRuleAction} className="mt-5 grid gap-4 rounded-2xl bg-celeste/25 p-4 sm:grid-cols-4">
                <Fld label="Aplica a">
                  <select name="scope" className={inputClass} defaultValue="ALL">
                    <option value="ALL">Todos los productos</option><option value="CATEGORY">Una categoría</option><option value="PRODUCT">Un producto (por SKU)</option>
                  </select>
                </Fld>
                <Fld label="Categoría (si aplica)"><select name="categoryId" className={inputClass} defaultValue=""><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Fld>
                <Fld label="SKU (si aplica)"><input name="sku" className={inputClass} /></Fld>
                <Fld label="Tratamiento"><select name="treatment" className={inputClass} defaultValue="TAXABLE">{TAX_TREATMENTS.map((t) => <option key={t} value={t}>{TAX_TREATMENT_LABELS[t]}</option>)}</select></Fld>
                <div className="sm:col-span-4"><button type="submit" className={primaryButton}>Agregar regla</button></div>
              </form>
            )}
          </>
        )}
      </section>
    </div>
  );
}
