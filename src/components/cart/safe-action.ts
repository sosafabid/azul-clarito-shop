import type { CartActionState } from "@/server/actions/cart";

export const CONNECTION_ERROR = "No pudimos comunicarnos con la tienda. Revisá tu conexión e intentá de nuevo.";

/**
 * Envuelve una acción del carrito: si la conexión falla, devuelve un mensaje en lugar de
 * dejar que el error rompa la página.
 */
export function safeCartAction(action: (previous: CartActionState, formData: FormData) => Promise<CartActionState>) {
  return async (previous: CartActionState, formData: FormData): Promise<CartActionState> => {
    try {
      return await action(previous, formData);
    } catch {
      return { ok: false, message: CONNECTION_ERROR, code: "network" };
    }
  };
}
