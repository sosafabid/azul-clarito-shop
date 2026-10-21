import { ORDER_STATUS_LABELS } from "@/components/admin/order-labels";
import type { OrderStatus } from "./order-status";

/**
 * Cómo ve la CLIENTA el estado de su pedido (lenguaje claro; nada interno). Los estados reales no cambian: esto solo los traduce.
 * Un pedido cancelado se muestra siempre como "Cancelado", aunque internamente tenga una alerta de pago por revisar.
 */
export type CustomerStatusTone = "pending" | "progress" | "done" | "closed";

export function customerStatus(status: string, requiresShipping: boolean): { label: string; tone: CustomerStatusTone; hint: string } {
  switch (status as OrderStatus) {
    case "PENDING":
      return { label: "Pendiente de pago", tone: "pending", hint: "Todavía no recibimos la confirmación del pago." };
    case "PAID":
      return requiresShipping
        ? { label: "Pago confirmado", tone: "progress", hint: "Estamos por preparar tu pedido." }
        : { label: "Pago confirmado", tone: "done", hint: "Tu compra digital está lista: pedí el enlace de descarga con tu correo y número de pedido." };
    case "PREPARING":
      return { label: ORDER_STATUS_LABELS.PREPARING, tone: "progress", hint: "Estamos preparando tu pedido." };
    case "PACKED":
      return { label: ORDER_STATUS_LABELS.PACKED, tone: "progress", hint: "Tu pedido está empacado y listo para salir." };
    case "SHIPPED":
      return { label: ORDER_STATUS_LABELS.SHIPPED, tone: "progress", hint: "Tu pedido va en camino." };
    case "DELIVERED":
      return { label: ORDER_STATUS_LABELS.DELIVERED, tone: "done", hint: "¡Entregado! Gracias por tu compra." };
    case "CANCELLED":
      return { label: ORDER_STATUS_LABELS.CANCELLED, tone: "closed", hint: "Este pedido fue cancelado." };
    case "REFUNDED":
      return { label: ORDER_STATUS_LABELS.REFUNDED, tone: "closed", hint: "Este pedido fue reembolsado." };
    default:
      return { label: "En proceso", tone: "pending", hint: "" };
  }
}

/** Solo enlaces de seguimiento http(s): nunca `javascript:` ni otros esquemas. */
export function safeTrackingUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}
