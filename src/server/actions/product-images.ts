"use server";

import { redirect } from "next/navigation";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { MAX_IMAGES_PER_PRODUCT, parseImageUrls } from "@/domain/images";
import { collectFiles } from "@/server/admin-forms";
import { requirePermission } from "@/server/auth";
import { resolveAuditActor } from "@/server/services/audit";
import { addProductImages, moveProductImage, removeProductImage, setPrimaryImage, updateImageAlt } from "@/server/services/catalog/admin-images";
import { deleteStoredImages, storeProductImages } from "@/server/services/images/storage";
import type { ProductFormState } from "./products";

/** Acciones de la galería de imágenes. Todas exigen permiso de escritura en el servidor. */
const back = (productId: string, notice: string) => `${routes.adminProduct(productId)}?saved=${notice}#imagenes`;

export async function addImagesAction(productId: string, _previous: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const session = await requirePermission("products:write");
  if (!isDatabaseConfigured()) return { errors: {}, message: "La base de datos no está configurada (falta DATABASE_URL)." };

  const urls = parseImageUrls(String(formData.get("imageUrls") ?? ""));
  if (urls.errors.length > 0) return { errors: { imageUrls: urls.errors[0] } };
  const files = collectFiles(formData, "imageFiles");
  if (urls.urls.length + files.length === 0) return { errors: {}, message: "Elegí un archivo o pegá al menos una URL." };
  if (urls.urls.length + files.length > MAX_IMAGES_PER_PRODUCT) return { errors: {}, message: `Máximo ${MAX_IMAGES_PER_PRODUCT} imágenes por producto.` };

  const uploaded = await storeProductImages(productId, files);
  if (!uploaded.ok) return { errors: { imageFiles: uploaded.message } };

  const result = await addProductImages(getDb(), productId, [...uploaded.images, ...urls.urls.map((url) => ({ url }))], resolveAuditActor(session));
  if (!result.ok) {
    await deleteStoredImages(uploaded.images.map((image) => image.url));
    return { errors: {}, message: result.message };
  }
  redirect(back(productId, "image-added"));
}

export async function removeImageAction(productId: string, imageId: string): Promise<void> {
  const session = await requirePermission("products:write");
  if (!isDatabaseConfigured()) redirect(back(productId, "action-failed"));
  const result = await removeProductImage(getDb(), imageId, resolveAuditActor(session));
  if (result.ok && result.removed?.storageKey) await deleteStoredImages([result.removed.url]);
  redirect(back(productId, result.ok ? "image-removed" : "action-failed"));
}

export async function setPrimaryImageAction(productId: string, imageId: string): Promise<void> {
  const session = await requirePermission("products:write");
  if (!isDatabaseConfigured()) redirect(back(productId, "action-failed"));
  const result = await setPrimaryImage(getDb(), imageId, resolveAuditActor(session));
  redirect(back(productId, result.ok ? "image-primary" : "action-failed"));
}

export async function moveImageAction(productId: string, imageId: string, direction: string): Promise<void> {
  await requirePermission("products:write");
  if (!isDatabaseConfigured() || (direction !== "up" && direction !== "down")) redirect(back(productId, "action-failed"));
  const result = await moveProductImage(getDb(), imageId, direction);
  redirect(back(productId, result.ok ? "image-moved" : "action-failed"));
}

export async function updateImageAltAction(productId: string, imageId: string, formData: FormData): Promise<void> {
  await requirePermission("products:write");
  if (!isDatabaseConfigured()) redirect(back(productId, "action-failed"));
  const result = await updateImageAlt(getDb(), imageId, String(formData.get("alt") ?? ""));
  redirect(back(productId, result.ok ? "image-updated" : "action-failed"));
}
