import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { productVariants, products } from "./catalog";
import { primaryId, timestamps } from "./common";
import { users } from "./users";

/**
 * CARRITO.
 *
 * Un carrito pertenece a UNA persona con sesión (`user_id`) o a UNA visitante
 * invitada (`guest_token_hash`), nunca a las dos: lo exige el CHECK.
 *
 *  - Invitada: el navegador guarda un token aleatorio en una cookie HttpOnly; aquí
 *    solo se guarda su HASH (sha256). Sin la cookie no se puede reclamar el carrito.
 *  - Con sesión: un carrito por persona (`carts_user_unique`).
 *  - Al iniciar sesión, el de invitada se FUSIONA con el de la cuenta y se borra.
 *
 * `updated_at` permite limpiar más adelante los carritos de invitadas abandonados
 * (todavía no hay tarea programada).
 *
 * El carrito NO guarda precios, costos ni nombres: solo qué producto/variante y
 * cuántas unidades. Todo lo demás se vuelve a leer de la base en cada vista.
 * Tampoco RESERVA stock: agregar al carrito no descuenta inventario.
 */
export const carts = pgTable(
  "carts",
  {
    id: primaryId(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    guestTokenHash: text("guest_token_hash"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("carts_user_unique").on(t.userId).where(sql`${t.userId} is not null`),
    uniqueIndex("carts_guest_token_unique").on(t.guestTokenHash).where(sql`${t.guestTokenHash} is not null`),
    check("carts_single_owner", sql`(${t.userId} is not null) <> (${t.guestTokenHash} is not null)`),
    index("carts_updated_idx").on(t.updatedAt),
  ],
);

/**
 * Líneas del carrito. La clave lógica de una línea es (carrito, producto, variante):
 * cada variante es una línea distinta aunque sea el mismo producto, y agregar lo
 * mismo dos veces SUMA en la misma línea (dos índices únicos parciales, porque
 * NULL no cuenta como igual en un índice único normal).
 */
export const cartItems = pgTable(
  "cart_items",
  {
    id: primaryId(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("cart_items_simple_unique").on(t.cartId, t.productId).where(sql`${t.variantId} is null`),
    uniqueIndex("cart_items_variant_unique").on(t.cartId, t.variantId).where(sql`${t.variantId} is not null`),
    check("cart_items_quantity_range", sql`${t.quantity} between 1 and 99`),
    index("cart_items_cart_idx").on(t.cartId),
  ],
);

export type Cart = typeof carts.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
