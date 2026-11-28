"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { analyticsItem, itemsValue, type AnalyticsItem, type PurchasePayload } from "@/domain/analytics";
import { trackEvent, useTrackOnce } from "@/lib/analytics/track";

/**
 * Eventos de tienda que se disparan al VER una página. Reciben solo datos ya preparados por el servidor (productos y montos
 * reales); no leen precios del navegador y no llevan datos personales. Cada uno se envía una vez por visita a la página.
 */

export function TrackViewItemList({ items, listId, listName, currency }: { items: AnalyticsItem[]; listId: string; listName: string; currency: string }) {
  useTrackOnce(() => (items.length === 0 ? true : trackEvent("view_item_list", { item_list_id: listId, item_list_name: listName, currency, items: items.slice(0, 100) })));
  return null;
}

export function TrackViewItem({ item, currency }: { item: AnalyticsItem; currency: string }) {
  useTrackOnce(() => trackEvent("view_item", { currency, value: itemsValue([item], currency), items: [item] }));
  return null;
}

export function TrackViewCart({ items, currency }: { items: AnalyticsItem[]; currency: string }) {
  useTrackOnce(() => trackEvent("view_cart", { currency, value: itemsValue(items, currency), items }));
  return null;
}

/** Una vez por sesión y por contenido del carrito (recargar el checkout no vuelve a contar un inicio de compra). */
export function TrackBeginCheckout({ items, currency, signature }: { items: AnalyticsItem[]; currency: string; signature: string }) {
  useTrackOnce(() => trackEvent("begin_checkout", { currency, value: itemsValue(items, currency), items }), { storage: "session", storageKey: `ac_bc_${signature}` });
  return null;
}

/** Cuando el envío ya está resuelto (con su costo o el retiro). Una vez por sesión, carrito y método de envío. */
export function TrackAddShippingInfo({ items, currency, tier, signature }: { items: AnalyticsItem[]; currency: string; tier: string; signature: string }) {
  useTrackOnce(() => trackEvent("add_shipping_info", { currency, value: itemsValue(items, currency), shipping_tier: tier, items }), { storage: "session", storageKey: `ac_si_${signature}` });
  return null;
}

/**
 * COMPRA. Solo se monta cuando el servidor confirmó el pago (estado del pedido en la base, verificado con Tilopay) y el pedido
 * es reciente. Una vez por navegador y pedido (guardado en el navegador) y, además, GA4 descarta repetidos con el mismo `transaction_id`.
 */
export function TrackPurchase({ payload }: { payload: PurchasePayload }) {
  useTrackOnce(() => trackEvent("purchase", { ...payload }), { storage: "local", storageKey: `ac_purchase_${payload.transaction_id}` });
  return null;
}

/** Enlace a un producto que registra `select_item` al hacer clic (desde el catálogo). */
export function TrackedProductLink({ item, listId, listName, currency, ...props }: ComponentProps<typeof Link> & { item: AnalyticsItem; listId: string; listName: string; currency: string }) {
  return <Link {...props} onClick={() => void trackEvent("select_item", { item_list_id: listId, item_list_name: listName, currency, items: [item] })} />;
}

export { analyticsItem };
