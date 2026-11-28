"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { routes } from "@/config/routes";
import { saveConsent, subscribeConsentPanel, useConsent } from "@/lib/analytics/consent";

/**
 * Aviso de cookies. Reglas: todo lo opcional empieza APAGADO; "Solo necesarias" pesa igual que "Aceptar todas"; la decisión se puede
 * cambiar cuando quiera desde "Preferencias de cookies" (pie de página y política de privacidad). La tienda funciona igual sin aceptar.
 */
export function CookieBanner() {
  const { hydrated, consent } = useConsent();
  const [panelOpen, setPanelOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(
    () =>
      subscribeConsentPanel(() => {
        setAnalytics(Boolean(consent?.analytics));
        setMarketing(Boolean(consent?.marketing));
        setCustomizing(true);
        setPanelOpen(true);
      }),
    [consent],
  );
  useEffect(() => {
    if (panelOpen) heading.current?.focus();
  }, [panelOpen]);

  if (!hydrated) return null;
  const visible = consent === null || panelOpen;
  if (!visible) return null;

  const decide = (choice: { analytics: boolean; marketing: boolean }) => {
    saveConsent(choice);
    setPanelOpen(false);
    setCustomizing(false);
  };
  const button = "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2 font-display text-sm font-bold transition-colors";

  return (
    <section role="dialog" aria-modal="false" aria-labelledby="cookie-title" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-3xl border-2 border-celeste bg-paper p-5 shadow-soft sm:p-6">
      <h2 id="cookie-title" ref={heading} tabIndex={-1} className="font-display text-lg font-bold text-navy focus:outline-none">
        Tu privacidad, tu decisión
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink/80">
        Usamos cookies necesarias para que la tienda funcione (carrito, ingreso y pago). Si lo permitís, también usamos cookies de <strong>medición</strong> (Google Analytics) para saber qué se visita y mejorar la tienda, y de <strong>publicidad</strong> (Meta) para medir
        anuncios. Podés cambiarlo cuando quieras. Más información en la{" "}
        <Link href={routes.privacy} className="font-semibold text-navy underline underline-offset-4">política de privacidad</Link>.
      </p>

      {customizing && (
        <fieldset className="mt-4 space-y-3 rounded-2xl bg-celeste/25 p-4">
          <legend className="sr-only">Categorías de cookies</legend>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked disabled className="mt-1 size-5 accent-navy" />
            <span><strong className="text-navy">Necesarias</strong> — carrito, sesión, pago y esta preferencia. Siempre activas.</span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-1 size-5 accent-navy" />
            <span><strong className="text-navy">Medición</strong> — Google Analytics: páginas vistas, productos vistos y compras, sin datos personales.</span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-1 size-5 accent-navy" />
            <span><strong className="text-navy">Publicidad</strong> — Meta Pixel: mide el resultado de anuncios en Facebook e Instagram.</span>
          </label>
        </fieldset>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {customizing ? (
          <button type="button" onClick={() => decide({ analytics, marketing })} className={`${button} bg-navy text-paper hover:bg-ink`}>Guardar preferencias</button>
        ) : (
          <button type="button" onClick={() => { setAnalytics(false); setMarketing(false); setCustomizing(true); }} className={`${button} border-2 border-celeste text-navy hover:border-navy`}>Personalizar</button>
        )}
        <button type="button" onClick={() => decide({ analytics: false, marketing: false })} className={`${button} border-2 border-navy text-navy hover:bg-navy hover:text-paper`}>Solo necesarias</button>
        <button type="button" onClick={() => decide({ analytics: true, marketing: true })} className={`${button} bg-navy text-paper hover:bg-ink`}>Aceptar todas</button>
      </div>
    </section>
  );
}
