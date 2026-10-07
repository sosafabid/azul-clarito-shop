"use server";

import { redirect } from "next/navigation";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { parseShippingMethodForm, parseShippingRateForm, parseTaxRateForm, parseTaxRuleForm } from "@/domain/settings-form";
import { formToRecord } from "@/server/admin-forms";
import { requirePermission } from "@/server/auth";
import { resolveAuditActor } from "@/server/services/audit";
import { deleteShippingRate, saveShippingMethod, saveShippingRate, setShippingMethodActive, setShippingRateActive } from "@/server/services/settings/shipping";
import { addTaxRule, deleteTaxRule, saveTaxRate } from "@/server/services/settings/tax";

/**
 * ACCIONES DE IMPUESTOS Y ENVÍOS. Lo que se configura acá cambia lo que paga la clienta, así que TODAS
 * exigen `settings:write` (solo SUPER_ADMIN) en el servidor antes de tocar la base de datos.
 * Los resultados vuelven a la página con `?saved=` o `?error=` (texto que genera el servidor).
 */
const NO_DB = "La base de datos no está configurada (falta DATABASE_URL).";
function back(path: string, key: "saved" | "error", message: string): never {
  redirect(`${path}?${key}=${encodeURIComponent(message.slice(0, 200))}`);
}
const firstError = (errors: Record<string, string>) => Object.values(errors)[0] ?? "Revisá los datos.";

// ── Impuestos ──
export async function saveTaxRateAction(formData: FormData): Promise<void> {
  const session = await requirePermission("settings:write");
  if (!isDatabaseConfigured()) back(routes.adminTaxes, "error", NO_DB);
  const parsed = parseTaxRateForm(formToRecord(formData));
  if (!parsed.ok) back(routes.adminTaxes, "error", firstError(parsed.errors));
  await saveTaxRate(getDb(), parsed.data, resolveAuditActor(session));
  back(routes.adminTaxes, "saved", "Impuesto guardado.");
}

export async function addTaxRuleAction(formData: FormData): Promise<void> {
  const session = await requirePermission("settings:write");
  if (!isDatabaseConfigured()) back(routes.adminTaxes, "error", NO_DB);
  const parsed = parseTaxRuleForm(formToRecord(formData));
  if (!parsed.ok) back(routes.adminTaxes, "error", firstError(parsed.errors));
  const result = await addTaxRule(getDb(), parsed.data, resolveAuditActor(session));
  back(routes.adminTaxes, result.ok ? "saved" : "error", result.ok ? "Regla guardada." : result.message);
}

export async function deleteTaxRuleAction(ruleId: string): Promise<void> {
  const session = await requirePermission("settings:write");
  if (!isDatabaseConfigured()) back(routes.adminTaxes, "error", NO_DB);
  await deleteTaxRule(getDb(), ruleId, resolveAuditActor(session));
  back(routes.adminTaxes, "saved", "Regla eliminada.");
}

// ── Envíos ──
export async function saveShippingMethodAction(methodId: string, formData: FormData): Promise<void> {
  const session = await requirePermission("settings:write");
  if (!isDatabaseConfigured()) back(routes.adminShipping, "error", NO_DB);
  const parsed = parseShippingMethodForm(formToRecord(formData));
  if (!parsed.ok) back(routes.adminShipping, "error", firstError(parsed.errors));
  const result = await saveShippingMethod(getDb(), methodId || null, parsed.data, resolveAuditActor(session));
  back(routes.adminShipping, result.ok ? "saved" : "error", result.ok ? "Método guardado." : result.message);
}

export async function toggleShippingMethodAction(methodId: string, active: boolean): Promise<void> {
  const session = await requirePermission("settings:write");
  if (!isDatabaseConfigured()) back(routes.adminShipping, "error", NO_DB);
  await setShippingMethodActive(getDb(), methodId, active, resolveAuditActor(session));
  back(routes.adminShipping, "saved", active ? "Método activado." : "Método desactivado.");
}

export async function saveShippingRateAction(methodId: string, rateId: string, formData: FormData): Promise<void> {
  const session = await requirePermission("settings:write");
  if (!isDatabaseConfigured()) back(routes.adminShipping, "error", NO_DB);
  const parsed = parseShippingRateForm(formToRecord(formData));
  if (!parsed.ok) back(routes.adminShipping, "error", firstError(parsed.errors));
  const result = await saveShippingRate(getDb(), methodId, rateId || null, parsed.data, resolveAuditActor(session));
  back(routes.adminShipping, result.ok ? "saved" : "error", result.ok ? "Tarifa guardada." : result.message);
}

export async function toggleShippingRateAction(rateId: string, active: boolean): Promise<void> {
  const session = await requirePermission("settings:write");
  if (!isDatabaseConfigured()) back(routes.adminShipping, "error", NO_DB);
  await setShippingRateActive(getDb(), rateId, active, resolveAuditActor(session));
  back(routes.adminShipping, "saved", active ? "Tarifa activada." : "Tarifa desactivada.");
}

export async function deleteShippingRateAction(rateId: string): Promise<void> {
  const session = await requirePermission("settings:write");
  if (!isDatabaseConfigured()) back(routes.adminShipping, "error", NO_DB);
  await deleteShippingRate(getDb(), rateId, resolveAuditActor(session));
  back(routes.adminShipping, "saved", "Tarifa eliminada.");
}
