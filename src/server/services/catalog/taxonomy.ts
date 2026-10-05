import "server-only";
import { eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { categories, collections } from "@/db/schema";
import { isUuid } from "@/domain/ids";
import { slugify } from "@/domain/slug";

/** Categorías y colecciones: elegir una existente o crear una nueva escribiendo su nombre. */
export type TaxonomyOption = { id: string; name: string };

export async function listCategoryOptions(db: Database): Promise<TaxonomyOption[]> {
  return db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(categories.name);
}

export async function listCollectionOptions(db: Database): Promise<TaxonomyOption[]> {
  return db.select({ id: collections.id, name: collections.name }).from(collections).orderBy(collections.name);
}

type Input = { categoryId: string | null; newCategory: string | null; collectionId: string | null; newCollection: string | null };
export type ResolvedTaxonomy =
  | { ok: true; categoryId: string | null; collectionId: string | null }
  | { ok: false; errors: Record<string, string> };

async function findOrCreate(db: Database, table: typeof categories | typeof collections, name: string): Promise<string | null> {
  const slug = slugify(name);
  if (!slug) return null;
  const [existing] = await db
    .select({ id: table.id })
    .from(table)
    .where(sql`lower(${table.name}) = ${name.toLowerCase()} or ${table.slug} = ${slug}`)
    .limit(1);
  if (existing) return existing.id;

  await db.insert(table).values({ id: crypto.randomUUID(), slug, name }).onConflictDoNothing();
  // Si otra persona la creó a la vez, tomamos la que quedó.
  const [created] = await db.select({ id: table.id }).from(table).where(eq(table.slug, slug)).limit(1);
  return created?.id ?? null;
}

async function exists(db: Database, table: typeof categories | typeof collections, id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const [row] = await db.select({ id: table.id }).from(table).where(eq(table.id, id)).limit(1);
  return Boolean(row);
}

export async function resolveTaxonomy(db: Database, input: Input): Promise<ResolvedTaxonomy> {
  const errors: Record<string, string> = {};
  let categoryId: string | null = null;
  let collectionId: string | null = null;

  if (input.newCategory) {
    categoryId = await findOrCreate(db, categories, input.newCategory);
    if (!categoryId) errors.newCategory = "El nombre de la categoría no es válido.";
  } else if (input.categoryId) {
    if (await exists(db, categories, input.categoryId)) categoryId = input.categoryId;
    else errors.categoryId = "Esa categoría ya no existe.";
  }

  if (input.newCollection) {
    collectionId = await findOrCreate(db, collections, input.newCollection);
    if (!collectionId) errors.newCollection = "El nombre de la colección no es válido.";
  } else if (input.collectionId) {
    if (await exists(db, collections, input.collectionId)) collectionId = input.collectionId;
    else errors.collectionId = "Esa colección ya no existe.";
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, categoryId, collectionId };
}
