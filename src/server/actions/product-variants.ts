"use server";

import { redirect } from "next/navigation";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { catalogCapabilities } from "@/domain/capabilities";
import { constrainVariantInput } from "@/domain/catalog-limits";
import { toCurrency } from "@/domain/money";
import { parseSizesForm } from "@/domain/sizes";
import { parseVariantForm } from "@/domain/variant-form";
import { formToRecord } from "@/server/admin-forms";
import { requirePermission } from "@/server/auth";
import { resolveAuditActor } from "@/server/services/audit";
import { getAdminProduct } from "@/server/services/catalog/admin";
import { addSizeVariants, addVariant, deleteVariant, listProductVariants, setVariantActive, updateVariant, type VariantResult } from "@/server/services/catalog/admin-variants";
import type { ProductFormState } from "./products";

/** Acciones de variantes. Agregar/editar/desactivar: STAFF o SUPER_ADMIN (sin costo ni stock para STAFF); eliminar: solo SUPER_ADMIN. */
const back = (productId: string, notice: string) => `${routes.adminProduct(productId)}?saved=${notice}#variantes`;
const NO_DB: ProductFormState = { errors: {}, message: "La base de datos no está configurada (falta DATABASE_URL)." };

function failure(result: Extract<VariantResult, { ok: false }>): ProductFormState {
  return { errors: result.code === "sku_taken" ? { sku: result.message } : {}, message: result.message };
}

export async function addVariantAction(productId: string, _previous: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const session = await requirePermission("products:write");
  if (!isDatabaseConfigured()) return NO_DB;
  const product = await getAdminProduct(getDb(), productId);
  if (!product) return { errors: {}, message: "Producto no encontrado." };

  const parsed = parseVariantForm(formToRecord(formData), toCurrency(product.currency));
  if (!parsed.ok) return { errors: parsed.errors };

  const data = constrainVariantInput(parsed.data, catalogCapabilities(session.role));
  const result = await addVariant(getDb(), productId, data, resolveAuditActor(session));
  if (!result.ok) return failure(result);
  redirect(back(productId, "variant-added"));
}

/** Crea varias tallas de una vez (XS, S, M…) con su stock. Todas o ninguna. */
export async function addSizesAction(productId: string, _previous: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const session = await requirePermission("products:write");
  if (!isDatabaseConfigured()) return NO_DB;
  const product = await getAdminProduct(getDb(), productId);
  if (!product) return { errors: {}, message: "Producto no encontrado." };

  const parsed = parseSizesForm(formToRecord(formData), toCurrency(product.currency));
  if (!parsed.ok) return { errors: parsed.errors };

  // Sin permiso de costos / stock no se guardan (igual que al agregar una variante suelta).
  const caps = catalogCapabilities(session.role);
  const data = { ...parsed.data, cost: caps.costs ? parsed.data.cost : null, sizes: parsed.data.sizes.map((s) => ({ ...s, stock: caps.stock ? s.stock : 0 })) };
  const result = await addSizeVariants(getDb(), productId, data, resolveAuditActor(session));
  if (!result.ok) return { errors: result.code === "sku_taken" ? { baseSku: result.message } : {}, message: result.message };
  redirect(back(productId, "sizes-added"));
}

export async function updateVariantAction(productId: string, variantId: string, _previous: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const session = await requirePermission("products:write");
  if (!isDatabaseConfigured()) return NO_DB;
  const product = await getAdminProduct(getDb(), productId);
  if (!product) return { errors: {}, message: "Producto no encontrado." };

  const record = formToRecord(formData);
  const parsed = parseVariantForm(record, toCurrency(product.currency));
  if (!parsed.ok) return { errors: parsed.errors };

  const caps = catalogCapabilities(session.role);
  const currentVariant = (await listProductVariants(getDb(), productId)).find((variant) => variant.id === variantId);
  if (!currentVariant) return { errors: {}, message: "Variante no encontrada." };
  const stored = { cost: currentVariant.cost, availableStock: currentVariant.availableStock };
  // Sin permiso de costos / stock se conserva lo guardado (lo que llegue en el formulario se descarta).
  const data = constrainVariantInput(parsed.data, caps, stored);

  const expectedRaw = record.expectedAvailableStock;
  const expectedFromForm = expectedRaw !== undefined && /^\d+$/.test(expectedRaw) ? Number(expectedRaw) : undefined;
  const expected = caps.stock ? expectedFromForm : stored.availableStock;
  const result = await updateVariant(getDb(), variantId, data, resolveAuditActor(session), expected);
  if (!result.ok) return failure(result);
  redirect(back(productId, "variant-updated"));
}

export async function toggleVariantAction(productId: string, variantId: string, active: boolean): Promise<void> {
  const session = await requirePermission("products:write");
  if (!isDatabaseConfigured()) redirect(back(productId, "action-failed"));
  const result = await setVariantActive(getDb(), variantId, active, resolveAuditActor(session));
  redirect(back(productId, result.ok ? "variant-updated" : "action-failed"));
}

export async function deleteVariantAction(productId: string, variantId: string): Promise<void> {
  const session = await requirePermission("products:delete");
  if (!isDatabaseConfigured()) redirect(back(productId, "action-failed"));
  const result = await deleteVariant(getDb(), variantId, resolveAuditActor(session));
  redirect(back(productId, result.ok ? "variant-deleted" : "variant-delete-blocked"));
}
