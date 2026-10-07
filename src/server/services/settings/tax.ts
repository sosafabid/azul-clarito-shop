import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { categories, products, taxRates, taxRules, type TaxRate } from "@/db/schema";
import { isUuid } from "@/domain/ids";
import type { ParsedTaxRate, ParsedTaxRule } from "@/domain/settings-form";
import type { TaxRuleScope, TaxTreatment } from "@/domain/tax";
import { auditInsert, type AuditActor } from "@/server/services/audit";

/**
 * CONFIGURACIÓN DE IMPUESTOS (panel). Primera versión: UNA tasa (registro "main") que se puede activar o no.
 * Solo se usa detrás de `requirePermission("settings:write")` / `settings:read`.
 */
export type TaxRuleRow = { id: string; scope: TaxRuleScope; treatment: TaxTreatment; categoryName: string | null; productSku: string | null; productName: string | null };
export type TaxSettings = { rate: TaxRate | null; rules: TaxRuleRow[]; categories: { id: string; name: string }[] };

export async function getTaxSettings(db: Database): Promise<TaxSettings> {
  const [rate] = await db.select().from(taxRates).orderBy(asc(taxRates.createdAt)).limit(1);
  const rules = rate
    ? await db
        .select({ id: taxRules.id, scope: taxRules.scope, treatment: taxRules.treatment, categoryName: categories.name, productSku: products.sku, productName: products.name })
        .from(taxRules)
        .leftJoin(categories, eq(categories.id, taxRules.categoryId))
        .leftJoin(products, eq(products.id, taxRules.productId))
        .where(eq(taxRules.taxRateId, rate.id))
        .orderBy(asc(taxRules.scope), asc(taxRules.createdAt))
    : [];
  const cats = await db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name));
  return { rate: rate ?? null, rules, categories: cats };
}

export async function saveTaxRate(db: Database, input: ParsedTaxRate, actor: AuditActor): Promise<void> {
  const [current] = await db.select().from(taxRates).limit(1);
  const after = { name: input.name, rateBps: input.rateBps, isActive: input.active, pricesIncludeTax: input.included, rounding: input.rounding };
  const metadata = {
    before: current ? { name: current.name, rateBps: current.rateBps, isActive: current.isActive, pricesIncludeTax: current.pricesIncludeTax, rounding: current.rounding } : null,
    after,
  };
  await db.batch([
    current
      ? db.update(taxRates).set(after).where(eq(taxRates.id, current.id))
      : db.insert(taxRates).values({ code: "main", ...after }),
    auditInsert(db, actor, [{ action: "tax.rate_saved", entityType: "tax_rate", entityId: current?.id ?? "main", metadata }]),
  ]);
}

export async function addTaxRule(db: Database, input: ParsedTaxRule, actor: AuditActor): Promise<{ ok: true } | { ok: false; message: string }> {
  const [rate] = await db.select({ id: taxRates.id }).from(taxRates).limit(1);
  if (!rate) return { ok: false, message: "Primero guardá el impuesto; después podés definir a qué aplica." };

  let productId: string | null = null;
  if (input.scope === "PRODUCT") {
    const [product] = await db.select({ id: products.id }).from(products).where(sql`lower(${products.sku}) = lower(${input.sku ?? ""})`).limit(1);
    if (!product) return { ok: false, message: "No encontramos un producto con ese SKU." };
    productId = product.id;
  }
  if (input.scope === "CATEGORY") {
    const [category] = input.categoryId && isUuid(input.categoryId) ? await db.select({ id: categories.id }).from(categories).where(eq(categories.id, input.categoryId)).limit(1) : [];
    if (!category) return { ok: false, message: "Esa categoría ya no existe." };
  }

  // Una sola regla por objetivo: si ya existía, se reemplaza.
  const sameTarget =
    input.scope === "ALL" ? eq(taxRules.scope, "ALL") : input.scope === "CATEGORY" ? and(eq(taxRules.scope, "CATEGORY"), eq(taxRules.categoryId, input.categoryId!)) : and(eq(taxRules.scope, "PRODUCT"), eq(taxRules.productId, productId!));
  await db.batch([
    db.delete(taxRules).where(and(eq(taxRules.taxRateId, rate.id), sameTarget)),
    db.insert(taxRules).values({ taxRateId: rate.id, scope: input.scope, categoryId: input.scope === "CATEGORY" ? input.categoryId : null, productId, treatment: input.treatment }),
    auditInsert(db, actor, [{ action: "tax.rule_added", entityType: "tax_rule", entityId: rate.id, metadata: { scope: input.scope, treatment: input.treatment, categoryId: input.categoryId, productId } }]),
  ]);
  return { ok: true };
}

export async function deleteTaxRule(db: Database, ruleId: string, actor: AuditActor): Promise<void> {
  if (!isUuid(ruleId)) return;
  await db.batch([
    db.delete(taxRules).where(eq(taxRules.id, ruleId)),
    auditInsert(db, actor, [{ action: "tax.rule_deleted", entityType: "tax_rule", entityId: ruleId, metadata: {} }]),
  ]);
}
