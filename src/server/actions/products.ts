"use server";

import { redirect } from "next/navigation";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { catalogCapabilities } from "@/domain/capabilities";
import { BELOW_COST_MESSAGE_FOR_STAFF, constrainProductInput, priceBelowStoredCost } from "@/domain/catalog-limits";
import { MAX_IMAGES_PER_PRODUCT, parseImageItems, type ImageItem } from "@/domain/images";
import { parseProductForm } from "@/domain/product-form";
import { deleteConfirmationMatches, isProductAction } from "@/domain/product-lifecycle";
import { formToRecord, safeProductsReturn } from "@/server/admin-forms";
import { requirePermission } from "@/server/auth";
import { resolveAuditActor } from "@/server/services/audit";
import {
  applyProductAction,
  createProduct,
  getAdminProduct,
  deleteProduct,
  updateProduct,
  type SaveProductResult,
} from "@/server/services/catalog/admin";
import { deleteUnusedImages, verifyStoredImages } from "@/server/services/images/storage";

/**
 * SERVER ACTIONS DE PRODUCTOS — escriben en la base de datos.
 *
 * Cada acción es un endpoint POST que cualquiera podría intentar invocar, por
 * eso CADA UNA empieza con `requirePermission(...)` (autorización en el
 * servidor). Esconder el botón o la página no protege nada. Sin sesión → login;
 * sin permiso → 404; y no se ejecuta nada.
 */
export type ProductFormState = { errors: Record<string, string>; message?: string } | null;

function failure(result: Extract<SaveProductResult, { ok: false }>): ProductFormState {
  const field =
    result.code === "slug_taken" ? "slug" : result.code === "sku_taken" ? "sku" : result.code === "stock_conflict" ? "availableStock" : null;
  return { errors: { ...(field ? { [field]: result.message } : {}), ...(result.errors ?? {}) }, message: result.message };
}

const NO_DB: ProductFormState = { errors: {}, message: "La base de datos no está configurada (falta DATABASE_URL)." };

export async function createProductAction(_previous: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const session = await requirePermission("products:write");
  if (!isDatabaseConfigured()) return NO_DB;

  const parsed = parseProductForm(formToRecord(formData), "create");
  if (!parsed.ok) return { errors: parsed.errors };
  // Quien no tiene permiso de costos / stock / publicación NO puede fijarlos, aunque fabrique la petición.
  const data = constrainProductInput(parsed.data, catalogCapabilities(session.role));

  // Las imágenes llegan ya subidas por /api/admin/product-images (lista JSON en orden; la primera es la principal).
  // Solo se aceptan archivos de la carpeta "pendiente" de ESTA persona o URLs externas https.
  const parsedItems = parseImageItems(String(formData.get("imageItems") ?? ""), [{ kind: "pending", userId: session.userId }]);
  if (!parsedItems.ok) return { errors: { imageUrls: parsedItems.error } };
  const images: ImageItem[] = [...parsedItems.items, ...data.imageUrls.filter((url) => !parsedItems.items.some((item) => item.url === url)).map((url) => ({ url }))];
  if (images.length > MAX_IMAGES_PER_PRODUCT) return { errors: { imageUrls: `Máximo ${MAX_IMAGES_PER_PRODUCT} imágenes por producto.` } };
  const verified = await verifyStoredImages(images);
  if (!verified.ok) return { errors: { imageUrls: verified.message } };

  const productId = crypto.randomUUID();
  const result = await createProduct(getDb(), data, resolveAuditActor(session), images, productId);
  if (!result.ok) return failure(result); // las imágenes subidas se conservan: la persona corrige el formulario y vuelve a guardar

  redirect(`${routes.adminProduct(result.id)}?saved=created`);
}

export async function updateProductAction(id: string, _previous: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const session = await requirePermission("products:write");
  if (!isDatabaseConfigured()) return NO_DB;

  const record = formToRecord(formData);
  const parsed = parseProductForm(record, "update");
  if (!parsed.ok) return { errors: parsed.errors };

  const caps = catalogCapabilities(session.role);
  const current = await getAdminProduct(getDb(), id);
  if (!current) return { errors: {}, message: "Producto no encontrado." };
  const stored = { cost: current.cost, availableStock: current.availableStock ?? 0 };

  // Sin permiso de costos / stock se conserva lo guardado (lo que llegue en el formulario se descarta).
  const data = constrainProductInput(parsed.data, caps, stored);
  if (!caps.costs && data.price !== current.price && priceBelowStoredCost(data.price, stored.cost)) {
    return { errors: { price: BELOW_COST_MESSAGE_FOR_STAFF } };
  }

  const expectedRaw = record.expectedAvailableStock;
  const expectedFromForm = expectedRaw !== undefined && /^\d+$/.test(expectedRaw) ? Number(expectedRaw) : undefined;
  const expected = caps.stock ? expectedFromForm : stored.availableStock;

  const result = await updateProduct(getDb(), id, data, resolveAuditActor(session), expected);
  if (!result.ok) return failure(result);

  redirect(`${routes.adminProduct(id)}?saved=updated`);
}

const ACTION_NOTICE = { publish: "published", hide: "hidden", archive: "archived", restore: "restored" } as const;

/**
 * Publicar / ocultar / archivar / restaurar. Se usa desde botones dentro de un <form>
 * (en el listado y en la ficha). `returnTo` es una ruta del panel de productos.
 */
export async function productLifecycleAction(id: string, action: string, returnTo: string): Promise<void> {
  // Publicar, ocultar, archivar y restaurar cambian lo que ve el público: solo quien tiene `products:publish`.
  const session = await requirePermission("products:publish");
  const back = safeProductsReturn(returnTo, routes.adminProducts);
  if (!isDatabaseConfigured() || !isProductAction(action)) redirect(back);

  const result = await applyProductAction(getDb(), id, action, resolveAuditActor(session));
  const separator = back.includes("?") ? "&" : "?";
  redirect(`${back}${separator}saved=${result.ok ? ACTION_NOTICE[action] : "action-failed"}`);
}

export type DeleteFormState = { message: string } | null;

/** Eliminación DEFINITIVA: solo SUPER_ADMIN, con confirmación escrita (el SKU) y sin historial de ventas. */
export async function deleteProductAction(id: string, sku: string, _previous: DeleteFormState, formData: FormData): Promise<DeleteFormState> {
  const session = await requirePermission("products:delete");
  if (!isDatabaseConfigured()) return { message: "La base de datos no está configurada (falta DATABASE_URL)." };

  if (formData.get("understand") !== "on") return { message: "Marcá la casilla para confirmar que entendés que es definitivo." };
  if (!deleteConfirmationMatches(String(formData.get("confirmSku") ?? ""), sku)) {
    return { message: "El texto no coincide con el SKU del producto. Escribilo tal cual para confirmar." };
  }

  const result = await deleteProduct(getDb(), id, resolveAuditActor(session));
  if (!result.ok) return { message: result.message };

  await deleteUnusedImages(getDb(), result.storedImages);
  redirect(`${routes.adminProducts}?saved=deleted`);
}
