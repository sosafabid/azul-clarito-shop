import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteProductForm } from "@/components/admin/DeleteProductForm";
import { DatabaseNotice, Notice } from "@/components/admin/Notice";
import { ProductActionButtons } from "@/components/admin/ProductActionButtons";
import { ProductStatusBadge } from "@/components/admin/ProductStatusBadge";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { DELETE_BLOCKER_MESSAGES } from "@/domain/product-lifecycle";
import { deleteProductAction } from "@/server/actions/products";
import { requirePermission } from "@/server/auth";
import { getDeleteInfo } from "@/server/services/catalog/admin";

export const metadata: Metadata = { title: "Eliminar producto" };

/** Pantalla de confirmación de la eliminación definitiva. Solo SUPER_ADMIN. */
export default async function DeleteProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("products:delete");
  const { id } = await params;
  if (!isDatabaseConfigured()) return <DatabaseNotice />;

  const info = await getDeleteInfo(getDb(), id);
  if (!info) notFound();
  const { product, blockers } = info;

  return (
    <div className="max-w-2xl space-y-6">
      <Link href={routes.adminProduct(product.id)} className="text-sm font-semibold text-navy underline underline-offset-4">
        ← Volver al producto
      </Link>
      <h1 className="text-3xl font-bold">Eliminar producto</h1>

      <div className="rounded-2xl border border-celeste bg-paper p-5">
        <p className="font-display text-xl font-bold text-navy">{product.name}</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink/70">
          {product.sku} <ProductStatusBadge status={product.status} />
        </p>
        <p className="mt-3 text-sm text-ink/75">
          También se borrarán sus {info.imageCount} imagen(es), {info.variantCount} variante(s) y su inventario.
        </p>
      </div>

      {blockers.length > 0 ? (
        <>
          <Notice tone="warning">
            <p className="font-bold">No se puede eliminar este producto.</p>
            <ul className="mt-2 list-disc pl-5">
              {blockers.map((blocker) => (
                <li key={blocker}>{DELETE_BLOCKER_MESSAGES[blocker]}</li>
              ))}
            </ul>
          </Notice>
          {product.status !== "ARCHIVED" && (
            <div>
              <p className="mb-3 text-sm text-ink/75">Lo que sí podés hacer es archivarlo: sale del catálogo activo y conserva su historial.</p>
              <ProductActionButtons id={product.id} status={product.status} returnTo={routes.adminProduct(product.id)} />
            </div>
          )}
        </>
      ) : (
        <>
          <Notice tone="warning">Esta acción es <strong>definitiva</strong>. Si solo querés sacarlo de la tienda, archivalo en su lugar.</Notice>
          <DeleteProductForm action={deleteProductAction.bind(null, product.id, product.sku)} sku={product.sku} />
        </>
      )}
    </div>
  );
}
