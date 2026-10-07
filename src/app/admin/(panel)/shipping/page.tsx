import type { Metadata } from "next";
import { DatabaseNotice } from "@/components/admin/Notice";
import { Fld, card, dangerButton, ghostButton, inputClass, primaryButton } from "@/components/admin/settings-ui";
import { Notice } from "@/components/ui/Notice";
import { getDb, isDatabaseConfigured } from "@/db";
import { SUPPORTED_CURRENCIES, formatMoney, toCurrency } from "@/domain/money";
import { can } from "@/domain/permissions";
import { CR_PROVINCES, SHIPPING_TYPES, SHIPPING_TYPE_LABELS } from "@/domain/shipping";
import { deleteShippingRateAction, saveNationalShippingAction, saveShippingMethodAction, saveShippingRateAction, toggleShippingMethodAction, toggleShippingRateAction } from "@/server/actions/settings";
import { requirePermission } from "@/server/auth";
import { findNationalShipping, listShippingAdmin } from "@/server/services/settings/shipping";
import type { ShippingMethod, ShippingRate } from "@/db/schema";

export const metadata: Metadata = { title: "Envíos" };

const money = (v: number | null) => (v === null ? "" : String(v));
/** Valor editable: colones enteros; dólares con 2 decimales. */
const plain = (amount: number, currency: string) => (currency === "USD" ? (amount / 100).toFixed(2) : String(amount));

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
      <Fld label="Nombre de la zona" hint="Solo para el panel (ej. GAM, Limón, Resto del país)"><input name="zoneName" defaultValue={rate?.zoneName ?? ""} maxLength={60} className={inputClass} /></Fld>
      <Fld label="Provincia(s)" hint="Vacío = todo el país. Varias: separalas con ;"><input name="province" list="provincias" defaultValue={rate?.stateProvince ?? ""} className={inputClass} /></Fld>
      <Fld label="Cantón(es) / ciudad(es)" hint="Vacío = todos. Varios: separalos con ;"><input name="city" defaultValue={rate?.city ?? ""} className={inputClass} /></Fld>
      <Fld label="Código postal"><input name="postalCode" defaultValue={rate?.postalCode ?? ""} className={inputClass} /></Fld>
      <Fld label="Precio *" hint="Lo que paga la clienta"><input name="price" defaultValue={rate ? plain(rate.price, rate.currency) : ""} inputMode="decimal" required className={inputClass} /></Fld>
      <Fld label="Moneda"><select name="currency" defaultValue={rate?.currency ?? "CRC"} className={inputClass}>{SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></Fld>
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
  const [methods, national] = await Promise.all([listShippingAdmin(getDb()), findNationalShipping(getDb())]);
  const base = national?.baseRate ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Envíos</h1>
        <p className="mt-1 text-sm text-ink/70">
          Por ahora se envía <strong>solo dentro de Costa Rica</strong> y la logística es manual (vos preparás el paquete y lo llevás a Correos de Costa Rica u otro servicio; el seguimiento lo anotás en el pedido).
          La clienta ve un único método, <strong>&ldquo;Envío nacional&rdquo;</strong>: el primero <strong>activo</strong> de tipo <em>Entrega a domicilio</em> (por prioridad). Podés cambiar su nombre y descripción acá.
          Los métodos de <em>Retiro en persona</em> todavía no se ofrecen en el checkout.
        </p>
        <p className="mt-2 text-sm text-ink/70">
          Cada método tiene tarifas por zona: provincia(s), cantón(es) o código postal; sin zona = todo el país. Gana la más específica dentro de su rango de pedido. Una zona como la GAM se arma
          listando sus cantones separados por <code>;</code>. Los montos los definís vos (no hay ninguno precargado), en colones; el costo real del courier es interno y nunca se muestra a la clienta.
        </p>
      </div>
      {saved && <Notice tone="success">{saved}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {!canWrite && <Notice>Podés ver la configuración. Solo un SUPER_ADMIN puede cambiarla.</Notice>}
      <datalist id="provincias">{CR_PROVINCES.map((p) => <option key={p} value={p} />)}</datalist>

      <section className={card}>
        <h2 className="text-xl font-bold">Envío nacional</h2>
        <p className="mt-1 text-sm text-ink/70">
          País: <strong>Costa Rica (CR)</strong> · Tarifa fija para todo el país. Por ahora solo se envía dentro de Costa Rica. Los cambios valen de inmediato para los nuevos cálculos del checkout; no hace falta tocar código ni redesplegar.
        </p>
        {!national && <Notice className="mt-3">Todavía no hay un método de entrega. Completá los datos y guardá para crear el &ldquo;Envío nacional&rdquo;.</Notice>}
        {national && !national.method.isActive && <Notice tone="warning" className="mt-3">El método está <strong>desactivado</strong>: el checkout muestra que no hay un método de envío disponible y no se puede continuar al pago.</Notice>}
        {national && base && base.currency !== "CRC" && <Notice tone="warning" className="mt-3">La tarifa está en {base.currency}: mientras los productos estén en colones, el envío no se va a aplicar.</Notice>}
        {national && national.otherDeliveryMethods > 0 && <Notice className="mt-3">Hay otros métodos de entrega creados. El checkout usa solo el primero <strong>activo</strong> por prioridad.</Notice>}
        {canWrite ? (
          <form action={saveNationalShippingAction} className="mt-5 grid gap-4 sm:grid-cols-2">
            <Fld label="Nombre del método"><input name="name" defaultValue={national?.method.name ?? ""} placeholder="Envío nacional" maxLength={60} required className={inputClass} /></Fld>
            <Fld label="Tarifa" hint="Lo que paga la clienta. Solo el número, sin símbolo."><input name="price" defaultValue={base ? plain(base.price, base.currency) : ""} inputMode="decimal" required className={inputClass} /></Fld>
            <Fld label="Moneda" hint="Debe coincidir con la de los productos (colones)."><select name="currency" defaultValue={base?.currency ?? "CRC"} className={inputClass}>{SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></Fld>
            <label className="flex items-center gap-2 self-end font-display text-sm font-bold text-navy">
              <input type="checkbox" name="active" defaultChecked={national?.method.isActive ?? true} className="size-4 accent-navy" />
              <span className={national?.method.isActive === false ? "text-ink/50" : "text-navy"}>●</span> Activo
            </label>
            <Fld label="Descripción para la clienta" className="sm:col-span-2"><textarea name="description" rows={3} maxLength={300} defaultValue={national?.method.description ?? ""} className={inputClass} /></Fld>
            <div className="sm:col-span-2"><button type="submit" className={primaryButton}>Guardar cambios</button></div>
          </form>
        ) : national ? (
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="font-bold text-navy">Nombre</dt><dd>{national.method.name}</dd></div>
            <div><dt className="font-bold text-navy">Tarifa</dt><dd>{base ? formatMoney(base.price, toCurrency(base.currency)) : "Sin tarifa"}</dd></div>
            <div><dt className="font-bold text-navy">Estado</dt><dd>{national.method.isActive ? "● Activo" : "○ Desactivado"}</dd></div>
            <div className="sm:col-span-2"><dt className="font-bold text-navy">Descripción</dt><dd>{national.method.description}</dd></div>
          </dl>
        ) : null}
        <p className="mt-4 text-xs text-ink/60">Si definís tarifas por zona (GAM, Limón…) abajo, para ese destino se usa la de la zona; esta tarifa cubre el resto del país.</p>
      </section>

      <details className="rounded-3xl border border-celeste bg-paper p-5 sm:p-7">
        <summary className="cursor-pointer font-display text-lg font-bold text-navy">Zonas y tarifas por provincia o cantón (avanzado)</summary>
        <div className="mt-5 space-y-6">
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
                      <strong className="text-navy">{([rate.zoneName, rate.stateProvince, rate.city, rate.postalCode].filter(Boolean).join(" · ") || "Todo Costa Rica")}</strong>
                      {" — "}{formatMoney(rate.price, toCurrency(rate.currency))}
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
      </details>
    </div>
  );
}
