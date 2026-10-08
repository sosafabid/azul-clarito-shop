import type { Metadata } from "next";
import Link from "next/link";
import { DatabaseNotice } from "@/components/admin/Notice";
import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { catalogCapabilities } from "@/domain/capabilities";
import { requirePermission } from "@/server/auth";
import { createProductAction } from "@/server/actions/products";
import { listCategoryOptions, listCollectionOptions } from "@/server/services/catalog/taxonomy";
import { isBlobConfigured } from "@/server/services/images/storage";

// Subir imágenes puede tardar: se amplía el tiempo máximo de la función (por defecto Vercel corta a los 10-15 s).
export const maxDuration = 30;

export const metadata: Metadata = { title: "Nuevo producto" };

const EMPTY: ProductFormValues = {
  name: "",
  slug: "",
  sku: "",
  shortDescription: "",
  description: "",
  status: "DRAFT",
  currency: "CRC",
  price: "",
  cost: "",
  availableStock: "0",
  lowStockThreshold: "3",
  categoryId: "",
  newCategory: "",
  collectionId: "",
  newCollection: "",
  imageUrls: "",
  isFeatured: false,
  isNew: false,
  isLimitedEdition: false,
};

export default async function NewProductPage() {
  const session = await requirePermission("products:write");
  const caps = catalogCapabilities(session.role);

  const configured = isDatabaseConfigured();
  const [categories, collections] = configured ? await Promise.all([listCategoryOptions(getDb()), listCollectionOptions(getDb())]) : [[], []];

  return (
    <div className="space-y-6">
      <Link href={routes.adminProducts} className="text-sm font-semibold text-navy underline underline-offset-4">
        ← Volver a productos
      </Link>
      <h1 className="text-3xl font-bold">Nuevo producto</h1>
      {configured ? (
        <ProductForm action={createProductAction} mode="create" initial={EMPTY} categories={categories} collections={collections} uploadsEnabled={isBlobConfigured()} caps={{ costs: caps.costs, stock: caps.stock, publish: caps.publish }} />
      ) : (
        <DatabaseNotice />
      )}
    </div>
  );
}
