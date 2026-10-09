"use server";

import { redirect } from "next/navigation";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { parseImageUrls } from "@/domain/images";
import { requirePermission } from "@/server/auth";
import { resolveAuditActor } from "@/server/services/audit";
import { addProductImages, moveProductImage, removeProductImage, setPrimaryImage, updateImageAlt } from "@/server/services/catalog/admin-images";
import { deleteUnusedImages } from "@/server/services/images/storage";
import type { ProductFormState } from "./products";

/** Acciones de la galería de imágenes. Todas exigen permiso de escritura en el servidor. */
const back = (productId: string, notice: string) => `${routes.adminProduct(productId)}?saved=${notice}#imagenes`;

export async function addImagesAction(productId: string, _previous: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const session = await requirePermission("products:write");
  if (!isDatabaseConfigured()) return { errors: {}, message: "La base de datos no está configurada (falta DATABASE_URL)." };

  const urls = parseImageUrls(String(formData.get("imageUrls") ?? ""));
  if (urls.errors.length > 0) return { errors: { imageUrls: urls.errors[0] } };
  if (urls.urls.length === 0) return { errors: {}, message: "Pegá al menos una URL https. Para subir archivos usá el selector de arriba." };

  const result = await addProductImages(getDb(), productId, urls.urls.map((url) => ({ url })), resolveAuditActor(session));
  if (!result.ok) return { errors: {}, message: result.message };
  redirect(back(productId, "image-added"));
}

export async function removeImageAction(productId: string, imageId: string): Promise<void> {
  const session = await requirePermission("products:write");
  if (!isDatabaseConfigured()) redirect(back(productId, "action-failed"));
  const result = await removeProductImage(getDb(), productId, imageId, resolveAuditActor(session));
  // La fila ya se quitó; el archivo se borra solo si ya nada lo usa (otra ficha o un pedido histórico).
  if (result.ok && result.removed?.storageKey) await deleteUnusedImages(getDb(), [{ url: result.removed.url, storageKey: result.removed.storageKey }]);
  redirect(back(productId, result.ok ? "image-removed" : "action-failed"));
}

export async function setPrimaryImageAction(productId: string, imageId: string): Promise<void> {
  const session = await requirePermission("products:write");
  if (!isDatabaseConfigured()) redirect(back(productId, "action-failed"));
  const result = await setPrimaryImage(getDb(), productId, imageId, resolveAuditActor(session));
  redirect(back(productId, result.ok ? "image-primary" : "action-failed"));
}

export async function moveImageAction(productId: string, imageId: string, direction: string): Promise<void> {
  await requirePermission("products:write");
  if (!isDatabaseConfigured() || (direction !== "up" && direction !== "down")) redirect(back(productId, "action-failed"));
  const result = await moveProductImage(getDb(), productId, imageId, direction);
  redirect(back(productId, result.ok ? "image-moved" : "action-failed"));
}

export async function updateImageAltAction(productId: string, imageId: string, formData: FormData): Promise<void> {
  await requirePermission("products:write");
  if (!isDatabaseConfigured()) redirect(back(productId, "action-failed"));
  const result = await updateImageAlt(getDb(), productId, imageId, String(formData.get("alt") ?? ""));
  redirect(back(productId, result.ok ? "image-updated" : "action-failed"));
}
