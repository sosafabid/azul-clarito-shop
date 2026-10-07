import type { Metadata } from "next";
import { DatabaseNotice } from "@/components/admin/Notice";
import { Fld, card, dangerButton, ghostButton, inputClass, primaryButton } from "@/components/admin/settings-ui";
import { Notice } from "@/components/ui/Notice";
import { getDb, isDatabaseConfigured } from "@/db";
import { formatMoney } from "@/domain/money";
import { can } from "@/domain/permissions";
import { COUNTRY_CODES, CR_PROVINCES, SHIPPING_TYPES, SHIPPING_TYPE_LABELS, countryName } from "@/domain/shipping";
import { deleteShippingRateAction, saveShippingMethodAction, saveShippingRateAction, toggleShippingMethodAction, toggleShippingRateAction } from "@/server/actions/settings";
import { requirePermission } from "@/server/auth";
import { listShippingAdmin } from "@/server/services/settings/shipping";
import type { ShippingMethod, ShippingRate } from "@/db/schema";

export const metadata: Metadata = { title: "Envíos" };

const money = (v: number | null) => (v === null ? "" : String(v));

function MethodFields({ method }: { method?: ShippingMethod }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Fld label="Nombre"><input name="name" defaultValue={method?.name ?? ""} required maxLength={60} className={inputClass} /></Fld>
      <Fld label="Código" hint="Se arma solo si lo dejás vacío"><input name="code" defaultValue={method?.code ?? ""} className={inputClass} /></Fld>
      <Fld label="Tipo"><select name="type" defaultValue={method?.type ?? "DELIVERY"} className={inputClass}>{SHIPPING_TYPES.map((t) => <option key={t} value={t}>{SHIPPING_TYPE_LABELS[t]}</option>)}</select></Fld>
      <Fld label="Descripción" className="sm:col-span-3"><input name="description" defaultValue={method?.description ?? ""} maxLength={300} className={inputClass} /></Fld>
      <Fld label="Días mínimos"><input name="daysMin" defaultValue={method?.estimatedDaysMin ?? ""} inputMode="numeric" className={inputClass} /></Fld>
      <Fld label="Días máximos"><input name="daysMax" defaultValue={method?.estimatedDaysMax ?? ""} inputMode="numeric" className={inputClass} /></Fld>
      <Fld label="Prioridad" hint="Menor número = se muestra primero"><input name="sortOrder" defaultValue={method?.sortOrder ?? 0} inputMode="numeric" className={inputClass} /></Fld>
      <label className="flex items-center gap-2 font-display text-sm font-bold text-navy"><input type="checkbox" name="active" defaultChecked={method?.isActive ?? false} className="size-4 accent-navy" /> Activo</label>
    </div>
  );
}

function RateFields({ rate }: { rate?: ShippingRate }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <Fld label="País" hint="Código (CR, US…) o vacío = cualquier país"><input name="country" list="paises" defaultValue={rate?.countryCode ?? ""} maxLength={2} className={inputClass} /></Fld>
      <Fld label="Provincia / zona"><input name="province" list="provincias" defaultValue={rate?.stateProvince ?? ""} className={inputClass} /></Fld>
      <Fld label="Ciudad / cantón"><input name="city" defaultValue={rate?.city ?? ""} className={inputClass} /></Fld>
      <Fld label="Código postal"><input name="postalCode" defaultValue={rate?.postalCode ?? ""} className={inputClass} /></Fld>
      <Fld label="Precio (₡) *"><input name="price" defaultValue={rate ? String(rate.price) : ""} inputMode="numeric" required className={inputClass} /></Fld>
      <Fld label="Pedido mínimo (₡)"><input name="minOrder" defaultValue={money(rate?.minOrderAmount ?? null)} inputMode="numeric" className={inputClass} /></Fld>
      <Fld label="Pedido máximo (₡)"><input name="maxOrder" defaultValue={money(rate?.maxOrderAmount ?? null)} inputMode="numeric" className={inputClass} /></Fld>
      <Fld label="Envío gratis desde (₡)"><input name="freeThreshold" defaultValue={money(rate?.freeShippingThreshold ?? null)} inputMode="numeric" className={inputClass} /></Fld>
      <label className="flex items-center gap-2 font-display text-sm font-bold text-navy"><input type="checkbox" name="active" defaultChecked={rate?.isActive ?? true} className="size-4 accent-navy" /> Tarifa activa</label>
    </div>
  );
}

export default async function AdminShippingPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const session = await requirePermission("settings:read");
  const canWrite = can(session.role, "settings:write");
  const { saved, error } = await searchParams;
  if (!isDatabaseConfigured()) return <DatabaseNotice />;
  const methods = await listShippingAdmin(getDb());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Envíos</h1>
        <p className="mt-1 text-sm text-ink/70">
          Cada método tiene tarifas por zona. Para un destino se usa la tarifa más específica (código postal, ciudad, provincia, país, cualquier país) dentro de su rango de pedido. No hay tarifas
          precargadas. Los importes están en colones (la tienda todavía no convierte monedas).
        </p>
      </div>
      {saved && <Notice tone="success">{saved}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {!canWrite && <Notice>Podés ver la configuración. Solo un SUPER_ADMIN puede cambiarla.</Notice>}
      <datalist id="provincias">{CR_PROVINCES.map((p) => <option key={p} value={p} />)}</datalist>
      <datalist id="paises">{COUNTRY_CODES.map((c) => <option key={c} value={c} label={countryName(c)} />)}</datalist>

      {methods.length === 0 && <section className={card}><p className="text-sm text-ink/75">Todavía no hay métodos de envío: en el checkout se mostrará que no hay envíos disponibles.</p></section>}

      {methods.map((method) => (
        <section key={method.id} className={card}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{method.name} <span className="ml-2 rounded-full bg-celeste/60 px-2.5 py-0.5 text-xs font-bold">{method.isActive ? "Activo" : "Inactivo"}</span></h2>
              <p className="text-sm text-ink/70">{SHIPPING_TYPE_LABELS[method.type]} · código {method.code}{method.estimatedDaysMin !== null ? ` · ${method.estimatedDaysMin}${method.estimatedDaysMax !== null ? `–${method.estimatedDaysMax}` : "+"} días` : ""}</p>
            </div>
            {canWrite && <form action={toggleShippingMethodAction.bind(null, method.id, !method.isActive)}><button type="submit" className={ghostButton}>{method.isActive ? "Desactivar" : "Activar"}</button></form>}
          </div>

          {method.rates.length === 0 ? <p className="mt-4 text-sm text-ink/70">Sin tarifas: este método no estará disponible para ningún destino.</p> : (
            <ul className="mt-4 space-y-3">
              {method.rates.map((rate) => (
                <li key={rate.id} className="rounded-2xl border border-celeste p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 text-sm">
                    <p>
                      <strong className="text-navy">{[rate.countryCode ? countryName(rate.countryCode) : "Cualquier país", rate.stateProvince, rate.city, rate.postalCode].filter(Boolean).join(" · ")}</strong>
                      {" — "}{formatMoney(rate.price, "CRC")}
                      {rate.freeShippingThreshold !== null && ` · gratis desde ${formatMoney(rate.freeShippingThreshold, "CRC")}`}
                      {(rate.minOrderAmount !== null || rate.maxOrderAmount !== null) && ` · pedido ${rate.minOrderAmount !== null ? `desde ${formatMoney(rate.minOrderAmount, "CRC")}` : ""}${rate.maxOrderAmount !== null ? ` hasta ${formatMoney(rate.maxOrderAmount, "CRC")}` : ""}`}
                      {!rate.isActive && <span className="ml-2 rounded-full bg-blush/45 px-2 py-0.5 text-xs font-bold">Inactiva</span>}
                    </p>
                    {canWrite && (
                      <div className="flex gap-2">
                        <form action={toggleShippingRateAction.bind(null, rate.id, !rate.isActive)}><button type="submit" className={ghostButton}>{rate.isActive ? "Desactivar" : "Activar"}</button></form>
                        <form action={deleteShippingRateAction.bind(null, rate.id)}><button type="submit" className={dangerButton}>Eliminar</button></form>
                      </div>
                    )}
                  </div>
                  {canWrite && (
                    <details className="mt-3">
                      <summary className="cursor-pointer font-display text-sm font-bold text-navy underline underline-offset-4">Editar tarifa</summary>
                      <form action={saveShippingRateAction.bind(null, method.id, rate.id)} className="mt-3 space-y-3"><RateFields rate={rate} /><button type="submit" className={primaryButton}>Guardar tarifa</button></form>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}

          {canWrite && (
            <div className="mt-5 space-y-3">
              <details className="rounded-2xl bg-celeste/25 p-4">
                <summary className="cursor-pointer font-display text-sm font-bold text-navy">+ Agregar tarifa</summary>
                <form action={saveShippingRateAction.bind(null, method.id, "")} className="mt-3 space-y-3"><RateFields /><button type="submit" className={primaryButton}>Agregar tarifa</button></form>
              </details>
              <details className="rounded-2xl bg-celeste/25 p-4">
                <summary className="cursor-pointer font-display text-sm font-bold text-navy">Editar método</summary>
                <form action={saveShippingMethodAction.bind(null, method.id)} className="mt-3 space-y-3"><MethodFields method={method} /><button type="submit" className={primaryButton}>Guardar método</button></form>
              </details>
            </div>
          )}
        </section>
      ))}

      {canWrite && (
        <section className={card}>
          <h2 className="text-xl font-bold">Nuevo método de envío</h2>
          <form action={saveShippingMethodAction.bind(null, "")} className="mt-4 space-y-3"><MethodFields /><button type="submit" className={primaryButton}>Crear método</button></form>
        </section>
      )}
    </div>
  );
}
