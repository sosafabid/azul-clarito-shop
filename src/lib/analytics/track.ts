"use client";

import { useEffect, useRef } from "react";
import { analyticsConfig } from "@/config/analytics";
import type { AnalyticsItem } from "@/domain/analytics";
import { readConsent, useConsent } from "./consent";
import { gaEvent, metaEvent } from "./destinations";

export type EcommerceEventName = "view_item_list" | "select_item" | "view_item" | "add_to_cart" | "view_cart" | "begin_checkout" | "add_shipping_info" | "purchase";

export type EcommerceParams = {
  currency?: string;
  value?: number;
  items: AnalyticsItem[];
  item_list_id?: string;
  item_list_name?: string;
  shipping_tier?: string;
  transaction_id?: string;
  tax?: number;
  shipping?: number;
};

/** Evento de Meta equivalente (los que Meta no usa para la tienda no se mandan). */
const META_EVENT: Partial<Record<EcommerceEventName, string>> = { view_item: "ViewContent", add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", purchase: "Purchase" };

function metaParams(params: EcommerceParams): Record<string, unknown> {
  return {
    content_type: "product",
    content_ids: params.items.map((item) => item.item_id),
    contents: params.items.map((item) => ({ id: item.item_id, quantity: item.quantity, item_price: item.price })),
    content_name: params.items.length === 1 ? params.items[0].item_name : undefined,
    num_items: params.items.reduce((sum, item) => sum + item.quantity, 0),
    value: params.value,
    currency: params.currency,
  };
}

/**
 * Envía un evento de tienda a cada herramienta que tenga el permiso de la persona. Devuelve si ALGUNA lo recibió
 * (si no hay permiso o la herramienta no está lista, no se envía nada y se puede reintentar).
 */
export function trackEvent(name: EcommerceEventName, params: EcommerceParams): boolean {
  const consent = readConsent();
  if (!consent) return false;
  let sent = false;
  if (consent.analytics && analyticsConfig.gaMeasurementId) sent = gaEvent(name, params) || sent;
  const metaName = META_EVENT[name];
  if (consent.marketing && analyticsConfig.metaPixelId && metaName && (name !== "purchase" || analyticsConfig.metaPurchaseEnabled)) {
    // `eventID` estable por compra: si más adelante se suma la API de Conversiones, Meta podrá deduplicar.
    sent = metaEvent(metaName, metaParams(params), name === "purchase" && params.transaction_id ? `purchase.${params.transaction_id}` : undefined) || sent;
  }
  return sent;
}

type OnceOptions = { storage?: "session" | "local"; storageKey?: string };

/**
 * Dispara un evento UNA vez por montaje (y, con `storage`, una vez por sesión o por navegador). Espera al permiso de la
 * persona: si aún no lo hay, reintenta cuando lo dé; si nunca lo da, no se mide nada.
 */
export function useTrackOnce(run: () => boolean, options: OnceOptions = {}): void {
  const { consent } = useConsent();
  const done = useRef(false);
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });
  const { storage, storageKey } = options;
  useEffect(() => {
    if (done.current || !consent) return;
    const store = storage ? (storage === "local" ? window.localStorage : window.sessionStorage) : null;
    // Se "reserva" la clave ANTES de enviar y se libera si no se pudo enviar: dos componentes o dos pestañas no mandan el mismo evento.
    const claim = (): boolean => {
      if (!store || !storageKey) return true;
      try {
        if (store.getItem(storageKey)) return false;
        store.setItem(storageKey, String(Date.now()));
      } catch {
        /* sin almacenamiento: se mide igual (GA4 además deduplica compras por transaction_id) */
      }
      return true;
    };
    const release = () => {
      try {
        if (store && storageKey) store.removeItem(storageKey);
      } catch {
        /* ignorar */
      }
    };
    // Pequeña espera: GA4 y el Pixel se cargan tras el permiso; si aún no están listos, se reintenta.
    let attempts = 0;
    const attempt = () => {
      if (done.current) return;
      if (!claim()) {
        done.current = true;
        return;
      }
      if (runRef.current()) {
        done.current = true;
        return;
      }
      release();
      attempts += 1;
      if (attempts < 12) timer = window.setTimeout(attempt, 250);
    };
    let timer = window.setTimeout(attempt, 0);
    return () => window.clearTimeout(timer);
  }, [consent, storage, storageKey]);
}
