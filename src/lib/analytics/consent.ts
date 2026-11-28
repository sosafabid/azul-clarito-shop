"use client";

import { useMemo, useSyncExternalStore } from "react";
import { CONSENT_COOKIE, CONSENT_MAX_AGE_DAYS, parseConsent, serializeConsent, type ConsentChoice, type StoredConsent } from "@/domain/analytics";

/**
 * Consentimiento de medición en el navegador. Se guarda en una cookie PROPIA (`ac_consent`, 180 días) que solo dice qué
 * se aceptó. Sin decisión (o con la decisión vencida) todo lo opcional queda APAGADO. Es una cookie necesaria: recordar la
 * decisión no requiere consentimiento.
 */
const CHANGE_EVENT = "ac:consent-change";
const OPEN_EVENT = "ac:consent-open";

function readRaw(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.split("; ").find((part) => part.startsWith(`${CONSENT_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(CONSENT_COOKIE.length + 1)) : "";
}

export function readConsent(): StoredConsent | null {
  return parseConsent(readRaw(), new Date());
}

export function saveConsent(choice: ConsentChoice): void {
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(serializeConsent(choice, new Date()))}; Path=/; Max-Age=${CONSENT_MAX_AGE_DAYS * 86_400}; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Abre el panel de preferencias (lo usa el enlace del pie de página y la política de privacidad). */
export function openConsentPanel(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}
export function subscribeConsentPanel(listener: () => void): () => void {
  window.addEventListener(OPEN_EVENT, listener);
  return () => window.removeEventListener(OPEN_EVENT, listener);
}

function subscribe(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

/** `hydrated=false` en el servidor y en la primera pintura (no se muestra ni se mide nada hasta saber la decisión real). */
export function useConsent(): { hydrated: boolean; consent: StoredConsent | null; raw: string } {
  const raw = useSyncExternalStore(subscribe, readRaw, () => undefined);
  return useMemo(() => ({ hydrated: raw !== undefined, consent: raw === undefined ? null : parseConsent(raw, new Date()), raw: raw ?? "" }), [raw]);
}
