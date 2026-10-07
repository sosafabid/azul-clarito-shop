import "server-only";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { Database } from "@/db/client";
import { shippingMethods, shippingRates, type ShippingMethod, type ShippingRate } from "@/db/schema";
import { isUuid } from "@/domain/ids";
import type { ParsedNationalShipping, ParsedShippingMethod, ParsedShippingRate } from "@/domain/settings-form";
import { STORE_COUNTRY } from "@/domain/shipping";
import { auditInsert, type AuditActor, type AuditEntry } from "@/server/services/audit";
import { uniqueViolationConstraint } from "@/server/services/catalog/admin";

/**
 * CONFIGURACIÓN DE ENVÍOS (panel): métodos y tarifas. Detrás de `settings:read` / `settings:write`.
 * Es configuración ECONÓMICA: cada cambio deja un registro de auditoría (quién, cuándo y antes/después).
 */
export type AdminShippingMethod = ShippingMethod & { rates: ShippingRate[] };
export type SaveResult = { ok: true } | { ok: false; message: string };

const clip = (value: unknown) => (typeof value === "string" ? value.slice(0, 200) : value);
/** { campo: { from, to } } solo de lo que cambió. */
function changesOf(before: Record<string, unknown>, after: Record<string, unknown>): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(after)) if (before[key] !== after[key]) out[key] = { from: clip(before[key]), to: clip(after[key]) };
  return out;
}
const has = (changes: object) => Object.keys(changes).length > 0;

async function commit(db: Database, statements: BatchItem<"pg">[], audits: AuditEntry[], actor: AuditActor) {
  if (audits.length > 0) statements.push(auditInsert(db, actor, audits));
  if (statements.length > 0) await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
}

export async function listShippingAdmin(db: Database): Promise<AdminShippingMethod[]> {
  const methods = await db.select().from(shippingMethods).orderBy(asc(shippingMethods.sortOrder), asc(shippingMethods.name));
  if (methods.length === 0) return [];
  const rates = await db.select().from(shippingRates).where(inArray(shippingRates.methodId, methods.map((m) => m.id))).orderBy(asc(shippingRates.countryCode), asc(shippingRates.stateProvince), asc(shippingRates.createdAt));
  return methods.map((method) => ({ ...method, rates: rates.filter((rate) => rate.methodId === method.id) }));
}

// ── "Envío nacional": el método de entrega y su tarifa base (todo el país) ─────────────────────
export type NationalShipping = { method: ShippingMethod; baseRate: ShippingRate | null; otherDeliveryMethods: number };

/** El método que edita el formulario simple: "envio-nacional", o el primer método de entrega por prioridad. */
export async function findNationalShipping(db: Database): Promise<NationalShipping | null> {
  const methods = await db.select().from(shippingMethods).where(eq(shippingMethods.type, "DELIVERY")).orderBy(asc(shippingMethods.sortOrder), asc(shippingMethods.name));
  const method = methods.find((m) => m.code === "envio-nacional") ?? methods[0];
  if (!method) return null;
  const [baseRate] = await db
    .select()
    .from(shippingRates)
    .where(and(eq(shippingRates.methodId, method.id), eq(shippingRates.countryCode, STORE_COUNTRY), isNull(shippingRates.stateProvince), isNull(shippingRates.city), isNull(shippingRates.postalCode)))
    .orderBy(asc(shippingRates.createdAt))
    .limit(1);
  return { method, baseRate: baseRate ?? null, otherDeliveryMethods: methods.length - 1 };
}

/**
 * Guarda nombre, descripción, estado y tarifa base del "Envío nacional". El método y la tarifa los decide el SERVIDOR
 * (el formulario no manda ids ni país: por ahora solo Costa Rica). Si todavía no existen, se crean.
 * Auditoría: crear método, modificar nombre/descripción, activar/desactivar y cambiar la tarifa (antes → después).
 */
export async function saveNationalShipping(db: Database, input: ParsedNationalShipping, actor: AuditActor): Promise<{ ok: true; changed: boolean } | { ok: false; message: string }> {
  const found = await findNationalShipping(db);
  const methodId = found?.method.id ?? crypto.randomUUID();
  const statements: BatchItem<"pg">[] = [];
  const audits: AuditEntry[] = [];
  const entity = (action: string, entityType: string, entityId: string, metadata: Record<string, unknown>): AuditEntry => ({ action, entityType, entityId, metadata });

  if (!found) {
    statements.push(db.insert(shippingMethods).values({ id: methodId, code: "envio-nacional", name: input.name, description: input.description, type: "DELIVERY", isActive: input.active, sortOrder: 0 }));
    audits.push(entity("shipping.method_created", "shipping_method", methodId, { name: input.name, active: input.active }));
  } else {
    const before = { name: found.method.name, description: found.method.description, isActive: found.method.isActive };
    const after = { name: input.name, description: input.description, isActive: input.active };
    const changes = changesOf(before, after);
    if (has(changes)) {
      statements.push(db.update(shippingMethods).set(after).where(eq(shippingMethods.id, methodId)));
      const { isActive, ...rest } = changes;
      if (has(rest)) audits.push(entity("shipping.method_updated", "shipping_method", methodId, { changes: rest }));
      if (isActive) audits.push(entity(input.active ? "shipping.method_activated" : "shipping.method_deactivated", "shipping_method", methodId, {}));
    }
  }

  const rate = found?.baseRate ?? null;
  if (!rate) {
    const rateId = crypto.randomUUID();
    statements.push(db.insert(shippingRates).values({ id: rateId, methodId, countryCode: STORE_COUNTRY, zoneName: "Todo Costa Rica", price: input.price, currency: input.currency, isActive: true }));
    audits.push(entity("shipping.rate_created", "shipping_rate", rateId, { methodId, price: input.price, currency: input.currency }));
  } else {
    const changes = changesOf({ price: rate.price, currency: rate.currency }, { price: input.price, currency: input.currency });
    if (has(changes)) {
      statements.push(db.update(shippingRates).set({ price: input.price, currency: input.currency }).where(eq(shippingRates.id, rate.id)));
      audits.push(entity("shipping.rate_changed", "shipping_rate", rate.id, { methodId, ...changes }));
    }
  }

  try {
    await commit(db, statements, audits, actor);
    return { ok: true, changed: audits.length > 0 };
  } catch (error) {
    if (uniqueViolationConstraint(error) !== null) return { ok: false, message: "Ya existe un método con ese código." };
    throw error;
  }
}

// ── Métodos y tarifas avanzados (zonas) ────────────────────────────────────────────────────────
export async function saveShippingMethod(db: Database, id: string | null, input: ParsedShippingMethod, actor: AuditActor): Promise<SaveResult> {
  const existing = id && isUuid(id) ? (await db.select().from(shippingMethods).where(eq(shippingMethods.id, id)).limit(1))[0] : undefined;
  if (id && !existing) return { ok: false, message: "Método no encontrado." };
  const values = {
    code: input.code, name: input.name, description: input.description, type: input.type,
    estimatedDaysMin: input.estimatedDaysMin, estimatedDaysMax: input.estimatedDaysMax, sortOrder: input.sortOrder, isActive: input.active,
  };
  const methodId = existing?.id ?? crypto.randomUUID();
  const statements: BatchItem<"pg">[] = [];
  const audits: AuditEntry[] = [];
  if (!existing) {
    statements.push(db.insert(shippingMethods).values({ id: methodId, ...values }));
    audits.push({ action: "shipping.method_created", entityType: "shipping_method", entityId: methodId, metadata: { code: input.code, name: input.name, type: input.type, active: input.active } });
  } else {
    const { isActive, ...rest } = changesOf(
      { code: existing.code, name: existing.name, description: existing.description, type: existing.type, estimatedDaysMin: existing.estimatedDaysMin, estimatedDaysMax: existing.estimatedDaysMax, sortOrder: existing.sortOrder, isActive: existing.isActive },
      values,
    );
    statements.push(db.update(shippingMethods).set(values).where(eq(shippingMethods.id, methodId)));
    if (has(rest)) audits.push({ action: "shipping.method_updated", entityType: "shipping_method", entityId: methodId, metadata: { changes: rest } });
    if (isActive) audits.push({ action: input.active ? "shipping.method_activated" : "shipping.method_deactivated", entityType: "shipping_method", entityId: methodId, metadata: {} });
  }
  try {
    await commit(db, statements, audits, actor);
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
  const existing = rateId && isUuid(rateId) ? (await db.select().from(shippingRates).where(eq(shippingRates.id, rateId)).limit(1))[0] : undefined;
  if (rateId && !existing) return { ok: false, message: "Tarifa no encontrada." };

  const values = {
    countryCode: input.countryCode, zoneName: input.zoneName, stateProvince: input.stateProvince, city: input.city, postalCode: input.postalCode, price: input.price, currency: input.currency,
    minOrderAmount: input.minOrderAmount, maxOrderAmount: input.maxOrderAmount, freeShippingThreshold: input.freeShippingThreshold, isActive: input.active,
  };
  const id = existing?.id ?? crypto.randomUUID();
  const statements: BatchItem<"pg">[] = [];
  const audits: AuditEntry[] = [];
  if (!existing) {
    statements.push(db.insert(shippingRates).values({ id, methodId, ...values }));
    audits.push({ action: "shipping.rate_created", entityType: "shipping_rate", entityId: id, metadata: { methodId, zone: input.zoneName, province: input.stateProvince, city: input.city, price: input.price, currency: input.currency } });
  } else {
    const changes = changesOf(
      { zoneName: existing.zoneName, stateProvince: existing.stateProvince, city: existing.city, postalCode: existing.postalCode, price: existing.price, currency: existing.currency, minOrderAmount: existing.minOrderAmount, maxOrderAmount: existing.maxOrderAmount, freeShippingThreshold: existing.freeShippingThreshold, isActive: existing.isActive },
      { zoneName: values.zoneName, stateProvince: values.stateProvince, city: values.city, postalCode: values.postalCode, price: values.price, currency: values.currency, minOrderAmount: values.minOrderAmount, maxOrderAmount: values.maxOrderAmount, freeShippingThreshold: values.freeShippingThreshold, isActive: values.isActive },
    );
    statements.push(db.update(shippingRates).set(values).where(eq(shippingRates.id, id)));
    const { price, currency, ...rest } = changes;
    if (price || currency) audits.push({ action: "shipping.rate_changed", entityType: "shipping_rate", entityId: id, metadata: { methodId, ...(price ? { price } : {}), ...(currency ? { currency } : {}) } });
    if (has(rest)) audits.push({ action: "shipping.rate_updated", entityType: "shipping_rate", entityId: id, metadata: { methodId, changes: rest } });
  }
  await commit(db, statements, audits, actor);
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
