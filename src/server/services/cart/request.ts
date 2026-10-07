import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { getDb, isDatabaseConfigured } from "@/db";
import { countCartUnits, getCartView, mergeGuestCart } from "./cart";
import { clearGuestCartCookie, getCartOwner, hashCartToken, readGuestToken } from "./identity";
import type { CartView } from "./types";

/** Unidades en el carrito de ESTA petición (para el header). Si algo falla, el header muestra 0 en vez de romper la página. */
export const getCartCount = cache(async (): Promise<number> => {
  // El contador depende de quién visita (cookie/sesión): se declara AQUÍ, fuera del try/catch, que
  // de otro modo se tragaría la señal con la que Next sabe que la página no puede ser estática.
  await connection();
  if (!isDatabaseConfigured()) return 0;
  try {
    const owner = await getCartOwner();
    return owner ? await countCartUnits(getDb(), owner) : 0;
  } catch (error) {
    console.error("[cart] no se pudo contar el carrito:", error instanceof Error ? error.message : error);
    return 0;
  }
});

/** Carrito completo y revalidado contra la base (para /cart). */
export async function getCartViewForRequest(): Promise<CartView | null> {
  if (!isDatabaseConfigured()) return null;
  const owner = await getCartOwner();
  if (!owner) return { lines: [], currency: null, subtotal: 0, totalUnits: 0, hasIssues: false };
  return getCartView(getDb(), owner);
}

/**
 * Al iniciar sesión o registrarse: fusiona el carrito de invitada con el de la cuenta y borra
 * la cookie de invitada. Si algo falla NO bloquea el ingreso: el carrito de invitada queda como estaba.
 */
export async function mergeCartOnLogin(userId: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const token = await readGuestToken();
  if (!token) return;
  try {
    await mergeGuestCart(getDb(), userId, hashCartToken(token));
    await clearGuestCartCookie();
  } catch (error) {
    console.error("[cart] no se pudo fusionar el carrito:", error instanceof Error ? error.message : error);
  }
}
