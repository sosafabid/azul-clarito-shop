import "server-only";
import { and, asc, count, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { Database } from "@/db/client";
import { cartItems, carts, inventory, productVariants, products } from "@/db/schema";
import {
  MAX_CART_LINES,
  limitMessage,
  limitQuantity,
  lineKey,
  lineStatus,
  lineTotal,
  maxPurchasable,
  mergedQuantity,
  subtotal,
  totalUnits,
  variantLabel,
} from "@/domain/cart";
import { isUuid } from "@/domain/ids";
import type { CartMutation, CartOwner, CartView, CartLineView } from "./types";

/**
 * SERVICIO DEL CARRITO (solo base de datos; la identidad de la persona vive en `identity.ts`).
 *
 * Todo lo que importa se decide AQUÍ, en el servidor, contra PostgreSQL:
 *  - el precio se lee de la base (jamás se recibe del navegador),
 *  - solo se puede agregar un producto ACTIVO (y, si tiene variantes, una variante ACTIVA),
 *  - la cantidad se limita al stock disponible y a un máximo por línea,
 *  - cada acción sobre una línea verifica que la línea sea del carrito de quien la pide.
 *
 * NO selecciona ni calcula costos, márgenes ni utilidades. NO reserva stock.
 */
const MAX_NEW_GUEST_CARTS_PER_10_MIN = 300;

const NOT_AVAILABLE = "Este producto ya no está disponible.";

// ── Carrito de una persona ──────────────────────────────────────────────
const ownerCondition = (owner: CartOwner) =>
  owner.kind === "user" ? eq(carts.userId, owner.userId) : eq(carts.guestTokenHash, owner.tokenHash);

export async function findCartId(db: Database, owner: CartOwner): Promise<string | null> {
  const [row] = await db.select({ id: carts.id }).from(carts).where(ownerCondition(owner)).limit(1);
  return row?.id ?? null;
}

async function ensureCart(db: Database, owner: CartOwner): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const existing = await findCartId(db, owner);
  if (existing) return { ok: true, id: existing };

  if (owner.kind === "guest") {
    // Freno básico contra la creación masiva de carritos de invitada.
    const [recent] = await db
      .select({ n: count() })
      .from(carts)
      .where(and(isNotNull(carts.guestTokenHash), sql`${carts.createdAt} > now() - interval '10 minutes'`));
    if ((recent?.n ?? 0) >= MAX_NEW_GUEST_CARTS_PER_10_MIN) {
      return { ok: false, message: "Estamos recibiendo muchas solicitudes. Intentá de nuevo en unos minutos." };
    }
  }
  const id = crypto.randomUUID();
  await db.insert(carts).values(owner.kind === "user" ? { id, userId: owner.userId } : { id, guestTokenHash: owner.tokenHash }).onConflictDoNothing();
  const created = await findCartId(db, owner); // si otra pestaña lo creó a la vez, tomamos ese
  return created ? { ok: true, id: created } : { ok: false, message: "No pudimos crear tu carrito. Intentá de nuevo." };
}

// ── Qué se puede comprar ────────────────────────────────────────────────
type Purchasable = {
  productId: string;
  variantId: string | null;
  unitPrice: number;
  currency: string;
  available: number;
};
type Resolution = { ok: true; item: Purchasable } | { ok: false; code: string; message: string };

/**
 * Valida un producto (y su variante) contra la base y devuelve su precio y disponibilidad ACTUALES.
 * 1) existe y está ACTIVO · 2) si tiene variantes, exige una variante ACTIVA de ese producto ·
 * 3) precio actual · 4) inventario disponible.
 */
async function resolvePurchasable(db: Database, productId: string, variantId: string | null): Promise<Resolution> {
  if (!isUuid(productId) || (variantId !== null && !isUuid(variantId))) {
    return { ok: false, code: "not_found", message: NOT_AVAILABLE };
  }
  const [product] = await db
    .select({ id: products.id, price: products.price, currency: products.currency, status: products.status })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!product || product.status !== "ACTIVE") return { ok: false, code: "not_found", message: NOT_AVAILABLE };

  const variants = await db
    .select({ id: productVariants.id, price: productVariants.price, isActive: productVariants.isActive })
    .from(productVariants)
    .where(eq(productVariants.productId, productId));
  const active = variants.filter((v) => v.isActive);

  let unitPrice = product.price;
  if (variants.length > 0) {
    if (active.length === 0) return { ok: false, code: "not_found", message: NOT_AVAILABLE };
    if (variantId === null) return { ok: false, code: "variant_required", message: "Elegí una opción antes de agregar al carrito." };
    const variant = active.find((v) => v.id === variantId);
    if (!variant) return { ok: false, code: "variant_invalid", message: "Esa opción ya no está disponible." };
    unitPrice = variant.price ?? product.price;
  } else if (variantId !== null) {
    return { ok: false, code: "variant_invalid", message: "Esa opción no existe para este producto." };
  }

  const [stock] = await db
    .select({ available: sql<number>`coalesce(sum(${inventory.availableStock}), 0)`.mapWith(Number) })
    .from(inventory)
    .where(and(eq(inventory.productId, productId), variantId ? eq(inventory.variantId, variantId) : isNull(inventory.variantId)));

  return { ok: true, item: { productId, variantId, unitPrice, currency: product.currency, available: stock?.available ?? 0 } };
}

// ── Agregar ─────────────────────────────────────────────────────────────
export async function addItem(
  db: Database,
  owner: CartOwner,
  input: { productId: string; variantId: string | null; quantity: number },
): Promise<CartMutation> {
  const resolved = await resolvePurchasable(db, input.productId, input.variantId);
  if (!resolved.ok) return resolved;
  const { item } = resolved;
  if (item.available <= 0) return { ok: false, code: "out_of_stock", message: "Este producto está agotado." };

  const cart = await ensureCart(db, owner);
  if (!cart.ok) return { ok: false, code: "cart_unavailable", message: cart.message };

  const lines = await db
    .select({ productId: cartItems.productId, variantId: cartItems.variantId, quantity: cartItems.quantity, currency: products.currency })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(eq(cartItems.cartId, cart.id));

  if (lines.some((line) => line.currency !== item.currency)) {
    return { ok: false, code: "currency_mismatch", message: "Tu carrito tiene productos en otra moneda. Un pedido se paga en una sola moneda." };
  }
  const existing = lines.find((line) => line.productId === item.productId && line.variantId === item.variantId);
  if (!existing && lines.length >= MAX_CART_LINES) {
    return { ok: false, code: "cart_full", message: `Tu carrito admite hasta ${MAX_CART_LINES} productos distintos.` };
  }

  const current = existing?.quantity ?? 0;
  const limit = limitQuantity(current + input.quantity, item.available);
  if (limit.quantity <= current) {
    return { ok: false, code: "at_limit", message: `Ya tenés en tu carrito todas las unidades disponibles (${current}).` };
  }

  // UNA sentencia: inserta la línea o, si ya existía, SUMA a la misma (sin pasar del tope).
  // Así dos clics casi simultáneos nunca crean dos líneas ni superan el tope.
  const cap = maxPurchasable(item.available);
  const add = Math.min(input.quantity, cap);
  const set = { quantity: sql`least(${cartItems.quantity} + ${add}, ${cap})`, updatedAt: new Date() };
  const base = db.insert(cartItems).values({ cartId: cart.id, productId: item.productId, variantId: item.variantId, quantity: add });
  const upsert =
    item.variantId === null
      ? base.onConflictDoUpdate({ target: [cartItems.cartId, cartItems.productId], targetWhere: isNull(cartItems.variantId), set })
      : base.onConflictDoUpdate({ target: [cartItems.cartId, cartItems.variantId], targetWhere: isNotNull(cartItems.variantId), set });
  const [rows] = await db.batch([upsert.returning({ quantity: cartItems.quantity }), db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id))]);
  const quantity = rows[0]?.quantity ?? limit.quantity;

  return limit.limited
    ? { ok: true, quantity, limited: true, message: limitMessage(limit) }
    : { ok: true, quantity, limited: false, message: "Agregado al carrito." };
}

// ── Modificar / eliminar una línea (siempre sobre una línea DEL carrito de quien lo pide) ──
async function findOwnedLine(db: Database, owner: CartOwner, lineId: string) {
  if (!isUuid(lineId)) return null;
  const [row] = await db
    .select({ id: cartItems.id, cartId: cartItems.cartId, productId: cartItems.productId, variantId: cartItems.variantId, quantity: cartItems.quantity })
    .from(cartItems)
    .innerJoin(carts, eq(carts.id, cartItems.cartId))
    .where(and(eq(cartItems.id, lineId), ownerCondition(owner)))
    .limit(1);
  return row ?? null;
}

export async function setQuantity(db: Database, owner: CartOwner, lineId: string, quantity: number): Promise<CartMutation> {
  const line = await findOwnedLine(db, owner, lineId);
  if (!line) return { ok: false, code: "not_found", message: "No encontramos ese producto en tu carrito." };

  const resolved = await resolvePurchasable(db, line.productId, line.variantId);
  if (!resolved.ok || resolved.item.available <= 0) return { ok: false, code: "unavailable", message: NOT_AVAILABLE };

  const limit = limitQuantity(quantity, resolved.item.available);
  await db.batch([
    db.update(cartItems).set({ quantity: limit.quantity }).where(and(eq(cartItems.id, line.id), eq(cartItems.cartId, line.cartId))),
    db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, line.cartId)),
  ]);
  return limit.limited
    ? { ok: true, quantity: limit.quantity, limited: true, message: limitMessage(limit) }
    : { ok: true, quantity: limit.quantity, limited: false, message: "Cantidad actualizada." };
}

export async function removeLine(db: Database, owner: CartOwner, lineId: string): Promise<CartMutation> {
  const line = await findOwnedLine(db, owner, lineId);
  if (!line) return { ok: false, code: "not_found", message: "No encontramos ese producto en tu carrito." };
  await db.batch([
    db.delete(cartItems).where(and(eq(cartItems.id, line.id), eq(cartItems.cartId, line.cartId))),
    db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, line.cartId)),
  ]);
  return { ok: true, quantity: 0, limited: false, message: "Producto eliminado del carrito." };
}

// ── Ver el carrito (siempre revalidado contra la base) ──────────────────
const EMPTY_VIEW: CartView = { lines: [], currency: null, subtotal: 0, totalUnits: 0, hasIssues: false };

export async function getCartView(db: Database, owner: CartOwner): Promise<CartView> {
  const cartId = await findCartId(db, owner);
  if (!cartId) return EMPTY_VIEW;

  const rows = await db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      variantId: cartItems.variantId,
      quantity: cartItems.quantity,
      slug: products.slug,
      name: products.name,
      productSku: products.sku,
      status: products.status,
      price: products.price,
      currency: products.currency,
      variantSku: productVariants.sku,
      variantName: productVariants.name,
      variantOptions: productVariants.options,
      variantPrice: productVariants.price,
      variantActive: productVariants.isActive,
      available: sql<number>`coalesce((select sum(i.available_stock) from inventory i where i.product_id = ${cartItems.productId} and i.variant_id is not distinct from ${cartItems.variantId}), 0)`.mapWith(Number),
      imageUrl: sql<string | null>`(select pi.url from product_images pi where pi.product_id = ${products.id} order by pi.is_primary desc, pi.sort_order asc, pi.created_at asc limit 1)`,
      imageAlt: sql<string | null>`(select pi.alt from product_images pi where pi.product_id = ${products.id} order by pi.is_primary desc, pi.sort_order asc, pi.created_at asc limit 1)`,
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .leftJoin(productVariants, eq(productVariants.id, cartItems.variantId))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(asc(cartItems.createdAt), asc(cartItems.id));

  const lines: CartLineView[] = rows.map((row) => {
    const purchasable = row.status === "ACTIVE" && (row.variantId === null || row.variantActive === true);
    const status = lineStatus({ purchasable, available: row.available, quantity: row.quantity });
    const unitPrice = row.variantPrice ?? row.price;
    const label = row.variantId ? variantLabel({ name: row.variantName, options: row.variantOptions, sku: row.variantSku }) : null;
    return {
      id: row.id,
      productId: row.productId,
      variantId: row.variantId,
      slug: row.slug,
      sku: row.variantSku ?? row.productSku,
      name: row.name,
      variantLabel: label,
      imageUrl: row.imageUrl,
      imageAlt: row.imageAlt,
      quantity: row.quantity,
      unitPrice,
      lineTotal: lineTotal(unitPrice, row.quantity),
      currency: row.currency,
      status,
      maxQuantity: purchasable ? maxPurchasable(row.available) : 0,
      availableNow: status === "insufficient" ? row.available : null,
    };
  });

  return {
    lines,
    currency: lines[0]?.currency ?? null,
    subtotal: subtotal(lines),
    totalUnits: totalUnits(lines),
    hasIssues: lines.some((line) => line.status !== "ok"),
  };
}

/** Unidades en el carrito (contador del header). Una consulta liviana; no valida stock. */
export async function countCartUnits(db: Database, owner: CartOwner): Promise<number> {
  const cartId = await findCartId(db, owner);
  if (!cartId) return 0;
  const [row] = await db
    .select({ units: sql<number>`coalesce(sum(${cartItems.quantity}), 0)`.mapWith(Number) })
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId));
  return row?.units ?? 0;
}

// ── Fusionar el carrito de invitada con el de la cuenta (al iniciar sesión) ──
export async function mergeGuestCart(db: Database, userId: string, guestTokenHash: string): Promise<{ lines: number; dropped: number }> {
  const [guest] = await db.select({ id: carts.id }).from(carts).where(eq(carts.guestTokenHash, guestTokenHash)).limit(1);
  if (!guest) return { lines: 0, dropped: 0 };

  const read = (cartId: string) =>
    db
      .select({ productId: cartItems.productId, variantId: cartItems.variantId, quantity: cartItems.quantity })
      .from(cartItems)
      .where(eq(cartItems.cartId, cartId))
      .orderBy(asc(cartItems.createdAt), asc(cartItems.id));

  const guestItems = await read(guest.id);
  if (guestItems.length === 0) {
    await db.delete(carts).where(eq(carts.id, guest.id));
    return { lines: 0, dropped: 0 };
  }
  const [userCart] = await db.select({ id: carts.id }).from(carts).where(eq(carts.userId, userId)).limit(1);
  const userItems = userCart ? await read(userCart.id) : [];

  const productIds = [...new Set([...guestItems, ...userItems].map((item) => item.productId))];
  const [stockRows, productRows] = await Promise.all([
    db.select({ productId: inventory.productId, variantId: inventory.variantId, available: inventory.availableStock }).from(inventory).where(inArray(inventory.productId, productIds)),
    db.select({ id: products.id, currency: products.currency }).from(products).where(inArray(products.id, productIds)),
  ]);
  const available = new Map(stockRows.map((row) => [lineKey(row.productId, row.variantId), row.available]));
  const currencyOf = new Map(productRows.map((row) => [row.id, row.currency]));

  // Un pedido se paga en una sola moneda: se conserva la de la cuenta (o la de la primera línea de la invitada).
  const currency = currencyOf.get((userItems[0] ?? guestItems[0]).productId);
  const merged = new Map<string, { productId: string; variantId: string | null; quantity: number }>();
  for (const item of userItems) merged.set(lineKey(item.productId, item.variantId), { ...item });

  let dropped = 0;
  for (const item of guestItems) {
    if (currencyOf.get(item.productId) !== currency) {
      dropped += 1;
      continue;
    }
    const key = lineKey(item.productId, item.variantId);
    const stock = available.get(key) ?? 0;
    const existing = merged.get(key);
    if (existing) existing.quantity = mergedQuantity(item.quantity, existing.quantity, stock);
    else merged.set(key, { ...item, quantity: mergedQuantity(item.quantity, 0, stock) });
  }

  const finalLines = [...merged.values()].slice(0, MAX_CART_LINES);
  const userCartId = userCart?.id ?? crypto.randomUUID();
  const statements: BatchItem<"pg">[] = [];
  if (!userCart) statements.push(db.insert(carts).values({ id: userCartId, userId }));
  statements.push(db.delete(cartItems).where(eq(cartItems.cartId, userCartId)));
  if (finalLines.length > 0) statements.push(db.insert(cartItems).values(finalLines.map((line) => ({ cartId: userCartId, ...line }))));
  statements.push(db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, userCartId)));
  statements.push(db.delete(carts).where(eq(carts.id, guest.id))); // sus líneas se borran en cascada
  await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
  return { lines: finalLines.length, dropped };
}
