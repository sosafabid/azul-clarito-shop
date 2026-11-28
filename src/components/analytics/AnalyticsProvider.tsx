"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { isSensitivePath } from "@/domain/analytics";
import { useConsent } from "@/lib/analytics/consent";
import { cleanLocation, gaEvent, metaEvent, startGa, startMeta, stopGa, stopMeta } from "@/lib/analytics/destinations";
import { CookieBanner } from "./CookieBanner";

/**
 * Único punto de entrada de la medición (se monta una sola vez, en el diseño de la tienda; el panel admin NO se mide).
 *  - Sin permiso, no se carga ningún script de terceros.
 *  - Una vista de página por cambio de ruta (el rastreo automático de GA4 está apagado: `send_page_view: false`), también al navegar
 *    dentro de la tienda sin recargar.
 *  - Si la persona retira el permiso, se apaga la herramienta y se borran sus cookies.
 */
export function AnalyticsProvider() {
  const { hydrated, consent } = useConsent();
  const pathname = usePathname();
  const gaPath = useRef<string | null>(null);
  const metaPath = useRef<string | null>(null);
  const analytics = Boolean(consent?.analytics);
  const marketing = Boolean(consent?.marketing);

  useEffect(() => {
    if (!hydrated) return;
    if (analytics) startGa();
    else {
      stopGa();
      gaPath.current = null;
    }
    if (marketing) startMeta();
    else {
      stopMeta();
      metaPath.current = null;
    }
  }, [hydrated, analytics, marketing]);

  useEffect(() => {
    if (!hydrated || (!analytics && !marketing)) return;
    // Espera un instante: el título de la página nuevo todavía no se actualizó al cambiar de ruta.
    const timer = window.setTimeout(() => {
      if (analytics && gaPath.current !== pathname) {
        if (gaEvent("page_view", { page_path: pathname, page_title: document.title, page_location: cleanLocation() })) gaPath.current = pathname;
      }
      if (marketing && metaPath.current !== pathname && !isSensitivePath(pathname)) {
        if (metaEvent("PageView", {})) metaPath.current = pathname;
      }
    }, 50);
    return () => window.clearTimeout(timer);
  }, [hydrated, analytics, marketing, pathname]);

  return <CookieBanner />;
}
