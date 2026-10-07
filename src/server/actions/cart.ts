"use server";

import { revalidatePath } from "next/cache";
import { getDb, isDatabaseConfigured } from "@/db";
import { parseQuantity } from "@/domain/cart";
import { addItem, removeLine, setQuantity } from "@/server/services/cart/cart";
import { getCartOwner, getOwnerForWrite } from "@/server/services/cart/identity";
import type { CartMutation } from "@/server/services/cart/types";

/**
 * ACCIONES DEL CARRITO — públicas por naturaleza: una visitante invitada también compra.
 *
 * Seguridad (verificada por pruebas de arquitectura):
 *  - Aceptan SOLO ids y cantidades. Nunca reciben ni usan un precio, un costo, un id de
 *    usuario o un id de carrito: el precio sale de la base de datos y la dueña del carrito
 *    se deduce de la sesión o de la cookie de invitada.
 *  - Cada acción sobre una línea comprueba que la línea sea del carrito de quien la pide.
 *  - Agregar al carrito NO reserva stock.
 */
export type CartActionState = { ok: boolean; message: string; code?: string; quantity?: number } | null;

const NO_DB: CartActionState = { ok: false, message: "La tienda no está disponible por ahora. Intentá de nuevo más tarde." };

function toState(result: CartMutation): CartActionState {
  // Refresca el header (contador) y la página actual con los datos nuevos.
  revalidatePath("/", "layout");
  return result.ok
    ? { ok: true, message: result.message, quantity: result.quantity }
    : { ok: false, message: result.message, code: result.code };
}

export async function addToCartAction(_previous: CartActionState, formData: FormData): Promise<CartActionState> {
  if (!isDatabaseConfigured()) return NO_DB;

  const quantity = parseQuantity(formData.get("quantity") ?? "1");
  if (!quantity.ok) return { ok: false, message: quantity.error, code: "invalid_quantity" };

  const variantRaw = String(formData.get("variantId") ?? "");
  const owner = await getOwnerForWrite(); // crea la cookie de invitada si hace falta
  const result = await addItem(getDb(), owner, {
    productId: String(formData.get("productId") ?? ""),
    variantId: variantRaw === "" ? null : variantRaw,
    quantity: quantity.value,
  });
  return toState(result);
}

/**
 * Cambiar la cantidad (botones − / + / "Ajustar") o eliminar una línea del carrito.
 * Es un formulario real: `quantity` y `remove` llegan según el botón que se presionó.
 * Solo se acepta el id de la línea (que debe ser del carrito de quien la pide) y una cantidad.
 */
export async function cartLineAction(_previous: CartActionState, formData: FormData): Promise<CartActionState> {
  if (!isDatabaseConfigured()) return NO_DB;
  const owner = await getCartOwner();
  if (!owner) return { ok: false, message: "No encontramos ese producto en tu carrito.", code: "not_found" };

  const lineId = String(formData.get("lineId") ?? "");
  if (formData.has("remove")) return toState(await removeLine(getDb(), owner, lineId));

  const quantity = parseQuantity(formData.get("quantity"));
  if (!quantity.ok) return { ok: false, message: quantity.error, code: "invalid_quantity" };
  return toState(await setQuantity(getDb(), owner, lineId, quantity.value));
}
