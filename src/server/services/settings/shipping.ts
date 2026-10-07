import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import type { Database } from "@/db/client";
import { shippingMethods, shippingRates, type ShippingMethod, type ShippingRate } from "@/db/schema";
import { isUuid } from "@/domain/ids";
import type { ParsedShippingMethod, ParsedShippingRate } from "@/domain/settings-form";
import { auditInsert, type AuditActor } from "@/server/services/audit";
import { uniqueViolationConstraint } from "@/server/services/catalog/admin";

/** CONFIGURACIÓN DE ENVÍOS (panel): métodos y tarifas por zona. Detrás de `settings:read` / `settings:write`. */
export type AdminShippingMethod = ShippingMethod & { rates: ShippingRate[] };
export type SaveResult = { ok: true } | { ok: false; message: string };

export async function listShippingAdmin(db: Database): Promise<AdminShippingMethod[]> {
  const methods = await db.select().from(shippingMethods).orderBy(asc(shippingMethods.sortOrder), asc(shippingMethods.name));
  if (methods.length === 0) return [];
  const rates = await db.select().from(shippingRates).where(inArray(shippingRates.methodId, methods.map((m) => m.id))).orderBy(asc(shippingRates.countryCode), asc(shippingRates.stateProvince), asc(shippingRates.createdAt));
  return methods.map((method) => ({ ...method, rates: rates.filter((rate) => rate.methodId === method.id) }));
}

export async function saveShippingMethod(db: Database, id: string | null, input: ParsedShippingMethod, actor: AuditActor): Promise<SaveResult> {
  const values = {
    code: input.code, name: input.name, description: input.description, type: input.type,
    estimatedDaysMin: input.estimatedDaysMin, estimatedDaysMax: input.estimatedDaysMax, sortOrder: input.sortOrder, isActive: input.active,
  };
  const methodId = id && isUuid(id) ? id : crypto.randomUUID();
  try {
    await db.batch([
      id && isUuid(id) ? db.update(shippingMethods).set(values).where(eq(shippingMethods.id, id)) : db.insert(shippingMethods).values({ id: methodId, ...values }),
      auditInsert(db, actor, [{ action: "shipping.method_saved", entityType: "shipping_method", entityId: methodId, metadata: { code: input.code, name: input.name, type: input.type, active: input.active, created: !id } }]),
    ]);
    return { ok: true };
  } catch (error) {
    if (uniqueViolationConstraint(error) !== null) return { ok: false, message: "Ya existe un método con ese código. Elegí otro." };
    throw error;
  }
}

export async function setShippingMethodActive(db: Database, id: string, active: boolean, actor: AuditActor): Promise<void> {
  if (!isUuid(id)) return;
  await db.batch([
    db.update(shippingMethods).set({ isActive: active }).where(eq(shippingMethods.id, id)),
    auditInsert(db, actor, [{ action: active ? "shipping.method_activated" : "shipping.method_deactivated", entityType: "shipping_method", entityId: id, metadata: {} }]),
  ]);
}

export async function saveShippingRate(db: Database, methodId: string, rateId: string | null, input: ParsedShippingRate, actor: AuditActor): Promise<SaveResult> {
  if (!isUuid(methodId)) return { ok: false, message: "Método no encontrado." };
  const [method] = await db.select({ id: shippingMethods.id }).from(shippingMethods).where(eq(shippingMethods.id, methodId)).limit(1);
  if (!method) return { ok: false, message: "Método no encontrado." };
  const values = {
    countryCode: input.countryCode, stateProvince: input.stateProvince, city: input.city, postalCode: input.postalCode, price: input.price, currency: "CRC",
    minOrderAmount: input.minOrderAmount, maxOrderAmount: input.maxOrderAmount, freeShippingThreshold: input.freeShippingThreshold, isActive: input.active,
  };
  const id = rateId && isUuid(rateId) ? rateId : crypto.randomUUID();
  await db.batch([
    rateId && isUuid(rateId) ? db.update(shippingRates).set(values).where(eq(shippingRates.id, rateId)) : db.insert(shippingRates).values({ id, methodId, ...values }),
    auditInsert(db, actor, [{ action: "shipping.rate_saved", entityType: "shipping_rate", entityId: id, metadata: { methodId, country: input.countryCode, province: input.stateProvince, city: input.city, price: input.price, freeThreshold: input.freeShippingThreshold, created: !rateId } }]),
  ]);
  return { ok: true };
}

export async function setShippingRateActive(db: Database, id: string, active: boolean, actor: AuditActor): Promise<void> {
  if (!isUuid(id)) return;
  await db.batch([
    db.update(shippingRates).set({ isActive: active }).where(eq(shippingRates.id, id)),
    auditInsert(db, actor, [{ action: active ? "shipping.rate_activated" : "shipping.rate_deactivated", entityType: "shipping_rate", entityId: id, metadata: {} }]),
  ]);
}

export async function deleteShippingRate(db: Database, id: string, actor: AuditActor): Promise<void> {
  if (!isUuid(id)) return;
  await db.batch([
    db.delete(shippingRates).where(eq(shippingRates.id, id)),
    auditInsert(db, actor, [{ action: "shipping.rate_deleted", entityType: "shipping_rate", entityId: id, metadata: {} }]),
  ]);
}
