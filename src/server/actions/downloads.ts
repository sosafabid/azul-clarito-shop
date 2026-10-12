"use server";

import { after } from "next/server";
import { getDb, isDatabaseConfigured } from "@/db";
import { AUTH_MESSAGES } from "@/domain/auth-tokens";
import { MAX_RECOVERY_EMAILS_PER_ORDER_PER_DAY } from "@/domain/fulfillment";
import { allowAttempt, clientIp } from "@/server/auth/throttle";
import { findRecoverableOrder } from "@/server/services/digital/delivery";
import { sendOrderEmail } from "@/server/services/orders/notify";

/**
 * "RECUPERAR MI COMPRA": la clienta pide enlaces nuevos con su correo + número de pedido.
 *
 * Seguridad:
 *  - Los enlaces se envían SOLO al correo guardado en el pedido (nunca a uno que escriba quien pide); lo que la persona escribe solo
 *    sirve para ENCONTRAR el pedido.
 *  - La respuesta es SIEMPRE la misma, exista o no el pedido (no revela qué correos o pedidos existen).
 *  - Límites por IP, por correo y por pedido (máx. 3 correos de recuperación por pedido y por día).
 *  - Solo hay enlaces si el pedido está pagado y verificado.
 */
export type RecoverState = { message?: string; done?: boolean; errors?: { email?: string; orderNumber?: string } } | null;

const LIMITS = { ip: { max: 10, windowSeconds: 60 * 60 }, email: { max: 5, windowSeconds: 60 * 60 } } as const;
const ORDER_NUMBER = /^AC-\d{4}-\d{6}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@.]{2,}$/;

const RECOVER_DONE_MESSAGE = "Si los datos corresponden a una compra con libros digitales ya pagada, te enviamos enlaces nuevos al correo del pedido. Revisá también la carpeta de spam.";

export async function requestDownloadRecoveryAction(_previous: RecoverState, formData: FormData): Promise<RecoverState> {
  if (!isDatabaseConfigured()) return { message: "El servicio no está disponible por ahora. Intentá de nuevo más tarde." };
  if (String(formData.get("website") ?? "") !== "") return { done: true, message: RECOVER_DONE_MESSAGE }; // campo trampa para bots

  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const orderNumber = String(formData.get("orderNumber") ?? "").trim().toUpperCase().slice(0, 20);
  const errors: NonNullable<RecoverState>["errors"] = {};
  if (!EMAIL.test(email)) errors.email = "Revisá tu correo electrónico.";
  if (!ORDER_NUMBER.test(orderNumber)) errors.orderNumber = "El número de pedido se ve así: AC-2026-000123.";
  if (errors.email || errors.orderNumber) return { errors, message: "Revisá los datos marcados." };

  const db = getDb();
  if (!(await allowAttempt(db, "recover_by_ip", await clientIp(), LIMITS.ip))) return { message: AUTH_MESSAGES.tooMany };
  if (!(await allowAttempt(db, "recover_by_email", email, LIMITS.email))) return { message: AUTH_MESSAGES.tooMany };

  const orderId = await findRecoverableOrder(db, { orderNumber, email });
  if (orderId) {
    // Se envía en segundo plano para que la respuesta tarde lo mismo exista o no el pedido. Cada correo reclama su propia fila
    // (`digital_recovery:<día>:<n>`): como mucho 3 por pedido y por día, y un doble envío del formulario no duplica el correo.
    const day = new Date().toISOString().slice(0, 10);
    after(async () => {
      for (let n = 1; n <= MAX_RECOVERY_EMAILS_PER_ORDER_PER_DAY; n += 1) {
        const outcome = await sendOrderEmail(db, { orderId, event: "digital_recovery", key: `digital_recovery:${day}:${n}` });
        if (outcome !== "skipped") break; // "skipped" = ese cupo ya se usó; se prueba el siguiente
      }
    });
  }
  return { done: true, message: RECOVER_DONE_MESSAGE };
}
