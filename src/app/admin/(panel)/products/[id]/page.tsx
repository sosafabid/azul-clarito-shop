import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EconomicsPanel } from "@/components/admin/EconomicsPanel";
import { ImagesManager } from "@/components/admin/ImagesManager";
import { DatabaseNotice, Notice } from "@/components/admin/Notice";
import { PRODUCT_NOTICES } from "@/components/admin/notices";
import { ProductActionButtons } from "@/components/admin/ProductActionButtons";
import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";
import { ProductStatusBadge } from "@/components/admin/ProductStatusBadge";
import { VariantsManager } from "@/components/admin/VariantsManager";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { catalogCapabilities } from "@/domain/capabilities";
import { redactCosts, stripCosts } from "@/domain/redaction";
import { updateProductAction } from "@/server/actions/products";
import { requirePermission } from "@/server/auth";
import { getAdminProduct, getStockSummaries } from "@/server/services/catalog/admin";
import { listProductImages } from "@/server/services/catalog/admin-images";
import { listProductVariants } from "@/server/services/catalog/admin-variants";
import { listCategoryOptions, listCollectionOptions } from "@/server/services/catalog/taxonomy";
import { isBlobConfigured } from "@/server/services/images/storage";

// Subir imágenes puede tardar: se amplía el tiempo máximo de la función (por defecto Vercel corta a los 10-15 s).
export const maxDuration = 30;

export const metadata: Metadata = { title: "Editar producto" };

function plainMoney(amount: number | null, currency: string): string {
  if (amount === null) return "";
  // Valor "editable": sin símbolo ni separadores (CRC: enteros; USD: 2 decimales).
  return currency === "USD" ? (amount / 100).toFixed(2) : String(amount);
}

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const session = await requirePermission("products:write");
  // Sin `costs:read`, el costo y toda la economía se quitan EN EL SERVIDOR (no llegan al navegador).
  const caps = catalogCapabilities(session.role);
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);

  if (!isDatabaseConfigured()) return <DatabaseNotice />;
  const db = getDb();
  const loaded = await getAdminProduct(db, id);
  if (!loaded) notFound();
  const product = caps.costs ? loaded : stripCosts(loaded);

  const [categories, collections, images, variants, summaries] = await Promise.all([
    listCategoryOptions(db),
    listCollectionOptions(db),
    listProductImages(db, id),
    listProductVariants(db, id),
    getStockSummaries(db, [id]),
  ]);
  const visibleVariants = redactCosts(variants, caps.costs);
  const stock = summaries.get(id) ?? { available: 0, reserved: 0, sold: 0, valueAtCost: null, potentialSales: 0, potentialProfit: null, rowsWithoutCost: 0 };
  const canDelete = caps.delete;
  const notice = saved ? PRODUCT_NOTICES[saved] : undefined;
  const hasVariants = variants.length > 0;

  const initial: ProductFormValues = {
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    status: product.status,
    currency: product.currency,
    price: plainMoney(product.price, product.currency),
    cost: plainMoney(product.cost, product.currency),
    availableStock: String(product.availableStock ?? 0),
    lowStockThreshold: String(product.lowStockThreshold ?? 0),
    categoryId: product.categoryId ?? "",
    newCategory: "",
    collectionId: product.collectionId ?? "",
    newCollection: "",
    imageUrls: "",
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    isLimitedEdition: product.isLimitedEdition,
  };

  return (
    <div className="space-y-6">
      <Link href={routes.adminProducts} className="text-sm font-semibold text-navy underline underline-offset-4">
        ← Volver a productos
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink/70">
            {product.sku} <ProductStatusBadge status={product.status} />
            {product.categoryName && <span>· {product.categoryName}</span>}
            {product.collectionName && <span>· {product.collectionName}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {product.status === "ACTIVE" && (
            <Link
              href={routes.product(product.slug)}
              className="inline-flex min-h-11 items-center rounded-full border-2 border-navy px-5 py-2 font-display text-sm font-bold text-navy hover:bg-navy hover:text-paper"
            >
              Ver en la tienda
            </Link>
          )}
          {caps.publish && <ProductActionButtons id={product.id} status={product.status} returnTo={routes.adminProduct(product.id)} />}
        </div>
      </div>

      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {product.status === "ARCHIVED" && <Notice tone="warning">Este producto está archivado: no aparece en el catálogo activo. Restauralo para volver a usarlo.</Notice>}

      {caps.costs && <EconomicsPanel price={product.price} cost={product.cost} currency={product.currency} stock={stock} />}

      <ProductForm
        action={updateProductAction.bind(null, product.id)}
        mode="edit"
        initial={initial}
        expectedAvailableStock={product.availableStock ?? 0}
        systemStock={hasVariants ? undefined : { reserved: product.reservedStock ?? 0, sold: product.soldStock ?? 0 }}
        categories={categories}
        collections={collections}
        hasVariants={hasVariants}
        caps={{ costs: caps.costs, stock: caps.stock, publish: caps.publish }}
      />

      <ImagesManager productId={product.id} productName={product.name} images={images} uploadsEnabled={isBlobConfigured()} />
      <VariantsManager productId={product.id} currency={product.currency} basePrice={product.price} variants={visibleVariants} canDelete={canDelete} caps={{ costs: caps.costs, stock: caps.stock }} />

      <section className="space-y-3 rounded-3xl border-2 border-coral/50 bg-paper p-5 sm:p-7">
        <h2 className="text-xl font-bold">Zona de peligro</h2>
        {canDelete ? (
          <>
            <p className="text-sm text-ink/75">
              La eliminación es definitiva y solo es posible si el producto no tiene historial de ventas. Si lo querés sacar de la tienda sin perderlo, usá <strong>Archivar</strong>.
            </p>
            <Link
              href={routes.adminProductDelete(product.id)}
              className="inline-flex min-h-11 items-center rounded-full border-2 border-coral px-5 py-2 font-display text-sm font-bold text-navy hover:bg-coral/15"
            >
              Eliminar producto…
            </Link>
          </>
        ) : (
          <p className="text-sm text-ink/75">Solo un SUPER_ADMIN puede eliminar productos definitivamente. Podés archivarlo desde los botones de arriba.</p>
        )}
      </section>
    </div>
  );
}
