import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { CART_TOKEN_PATTERN, GUEST_CART_DAYS } from "@/domain/cart";
import { getSession } from "@/server/auth";
import type { CartOwner } from "./types";

/**
 * ¿De quién es el carrito de esta petición?
 *
 *  - Con sesión iniciada → de esa cuenta (`carts.user_id`).
 *  - Sin sesión → de la visitante invitada, identificada por una cookie HttpOnly con un
 *    token ALEATORIO. La cookie no contiene nada más: ni ids de productos, ni precios,
 *    ni datos personales. En la base solo se guarda el HASH del token.
 */
export const CART_COOKIE = "ac_cart";

export const hashCartToken = (token: string) => createHash("sha256").update(token).digest("hex");

const cookieOptions = () =>
  ({
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GUEST_CART_DAYS * 24 * 60 * 60,
  }) as const;

export async function readGuestToken(): Promise<string | null> {
  const value = (await cookies()).get(CART_COOKIE)?.value;
  return value && CART_TOKEN_PATTERN.test(value) ? value : null;
}

/** Dueña del carrito para LEER (no crea nada). `null` = todavía no tiene carrito. */
export const getCartOwner = cache(async (): Promise<CartOwner | null> => {
  const session = await getSession();
  if (session) return { kind: "user", userId: session.userId };
  const token = await readGuestToken();
  return token ? { kind: "guest", tokenHash: hashCartToken(token) } : null;
});

/**
 * Dueña del carrito para ESCRIBIR (solo desde Server Actions). Si es invitada y no tiene
 * cookie, se crea una con un token nuevo; si ya la tiene, se renueva su caducidad
 * (30 días desde la última vez que usó el carrito).
 */
export async function getOwnerForWrite(): Promise<CartOwner> {
  const session = await getSession();
  if (session) return { kind: "user", userId: session.userId };
  const token = (await readGuestToken()) ?? randomBytes(32).toString("base64url");
  (await cookies()).set(CART_COOKIE, token, cookieOptions());
  return { kind: "guest", tokenHash: hashCartToken(token) };
}

export async function clearGuestCartCookie(): Promise<void> {
  (await cookies()).delete(CART_COOKIE);
}
