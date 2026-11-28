"use client";

import { analyticsConfig } from "@/config/analytics";
import { sanitizePageLocation } from "@/domain/analytics";

/**
 * Carga y apagado de Google Analytics 4 y Meta Pixel. NADA se carga sin ID configurado y sin el permiso de la persona.
 *  - GA4: sin señales de Google ni personalización de anuncios; solo medición de la tienda. `page_location` va SIN parámetros
 *    (ver `sanitizePageLocation`) para que el enlace privado del pedido nunca llegue a Google.
 *  - Meta: cada llamada se hace con la dirección de la página "limpia" (sin parámetros) por unos instantes.
 */
type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
type TrackerWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; fbq?: Fbq; _fbq?: Fbq; [key: `ga-disable-${string}`]: boolean | undefined };

const w = (): TrackerWindow => window as unknown as TrackerWindow;

let gaStarted = false;
let metaStarted = false;

export function cleanLocation(): string {
  return sanitizePageLocation(window.location.href);
}

// ── Google Analytics 4 ─────────────────────────────────────────────────────────────────────────────────────────
export function startGa(): boolean {
  const id = analyticsConfig.gaMeasurementId;
  if (!id) return false;
  const win = w();
  win[`ga-disable-${id}`] = false;
  if (gaStarted) {
    win.gtag?.("consent", "update", { analytics_storage: "granted" });
    return true;
  }
  gaStarted = true;
  win.dataLayer = win.dataLayer ?? [];
  win.gtag = function gtag() {
    // gtag.js exige `arguments` (no un array) en la cola.
    // eslint-disable-next-line prefer-rest-params
    (win.dataLayer as unknown[]).push(arguments);
  };
  win.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  win.gtag("js", new Date());
  win.gtag("set", { page_location: cleanLocation() });
  win.gtag("config", id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
  return true;
}

export function stopGa(): void {
  const id = analyticsConfig.gaMeasurementId;
  if (!id || !gaStarted) return;
  const win = w();
  win[`ga-disable-${id}`] = true;
  win.gtag?.("consent", "update", { analytics_storage: "denied" });
  for (const cookie of document.cookie.split("; ")) {
    const name = cookie.split("=")[0];
    if (name === "_ga" || name.startsWith("_ga_") || name === "_gid") document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
  }
}

export function gaEvent(name: string, params: Record<string, unknown>): boolean {
  const win = w();
  if (!analyticsConfig.gaMeasurementId || !win.gtag || !gaStarted) return false;
  win.gtag("set", { page_location: cleanLocation() });
  win.gtag("event", name, { ...params, page_location: cleanLocation() });
  return true;
}

// ── Meta Pixel ─────────────────────────────────────────────────────────────────────────────────────────────────
export function startMeta(): boolean {
  const id = analyticsConfig.metaPixelId;
  if (!id) return false;
  const win = w();
  if (metaStarted) {
    win.fbq?.("consent", "grant");
    return true;
  }
  metaStarted = true;
  if (!win.fbq) {
    const fbq: Fbq = function fbqStub(...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else (fbq.queue as unknown[]).push(args);
    } as Fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    win.fbq = fbq;
    win._fbq = fbq;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  win.fbq?.("consent", "grant");
  withCleanLocation(() => win.fbq?.("init", id));
  return true;
}

export function stopMeta(): void {
  if (!metaStarted) return;
  w().fbq?.("consent", "revoke");
  document.cookie = "_fbp=; Max-Age=0; Path=/; SameSite=Lax";
  document.cookie = "_fbc=; Max-Age=0; Path=/; SameSite=Lax";
}

let swaps = 0;
/** Ejecuta `fn` con la barra de direcciones sin parámetros (el Pixel lee la dirección completa) y la restaura enseguida. */
export function withCleanLocation(fn: () => void): void {
  const original = window.location.pathname + window.location.search + window.location.hash;
  const clean = cleanLocation();
  const target = clean ? new URL(clean).pathname + new URL(clean).search : original;
  if (target === original) {
    fn();
    return;
  }
  swaps += 1;
  window.history.replaceState(window.history.state, "", target);
  try {
    fn();
  } finally {
    window.setTimeout(() => {
      swaps -= 1;
      if (swaps === 0) window.history.replaceState(window.history.state, "", original);
    }, 1500);
  }
}

export function metaEvent(name: string, params: Record<string, unknown>, eventId?: string): boolean {
  const win = w();
  if (!analyticsConfig.metaPixelId || !win.fbq || !metaStarted) return false;
  withCleanLocation(() => win.fbq?.("track", name, params, eventId ? { eventID: eventId } : undefined));
  return true;
}
