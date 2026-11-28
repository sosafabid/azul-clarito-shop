import Link from "next/link";
import { TrackedProductLink } from "@/components/analytics/TrackEvents";
import { routes } from "@/config/routes";
import { analyticsItem } from "@/domain/analytics";
import { formatMoney, toCurrency } from "@/domain/money";
import type { PublicProductListItem } from "@/types/catalog";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { CardAddButton } from "./CardAddButton";
import { ProductImage } from "./ProductImage";

/** `list` + `index` (opcionales) identifican el listado donde se ve el producto, para medir el clic (`select_item`). */
export function ProductCard({ product, list, index }: { product: PublicProductListItem; list?: { id: string; name: string }; index?: number }) {
  const item = analyticsItem({ sku: product.sku, name: product.name, unitPrice: product.price, currency: product.currency, category: product.categoryName, listName: list?.name, index });
  const linkClass = "group flex flex-1 flex-col";
  const content = (
    <>
      <ProductImage src={product.imageUrl} alt={product.imageAlt ?? product.name} className="transition-transform duration-300 motion-safe:group-hover:scale-[1.02]" />
      <div className="flex flex-1 flex-col gap-2 p-5 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {product.productType === "DIGITAL" && <span className="rounded-full bg-aqua/30 px-2.5 py-0.5 font-display text-xs font-bold text-navy">Digital · PDF</span>}
          {product.isNew && <span className="rounded-full bg-navy px-2.5 py-0.5 font-display text-xs font-bold text-paper">Nuevo</span>}
          {product.isLimitedEdition && <span className="rounded-full bg-sand px-2.5 py-0.5 font-display text-xs font-bold text-navy">Edición limitada</span>}
        </div>
        <h3 className="font-display text-xl font-bold text-navy">{product.name}</h3>
        {product.shortDescription && <p className="text-sm leading-relaxed text-ink/75">{product.shortDescription}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <span className="font-display text-lg font-bold text-navy">{formatMoney(product.price, toCurrency(product.currency))}</span>
          <AvailabilityBadge availability={product.availability} />
        </div>
      </div>
    </>
  );
  return (
    <li className="flex h-full flex-col overflow-hidden rounded-3xl border border-celeste bg-paper transition-shadow hover:shadow-soft">
      {list ? (
        <TrackedProductLink href={routes.product(product.slug)} className={linkClass} item={item} listId={list.id} listName={list.name} currency={product.currency}>
          {content}
        </TrackedProductLink>
      ) : (
        <Link href={routes.product(product.slug)} className={linkClass}>
          {content}
        </Link>
      )}
      <div className="px-5 pb-5">
        <CardAddButton productId={product.id} slug={product.slug} hasVariants={product.hasVariants} soldOut={product.availability === "out_of_stock"} item={analyticsItem({ sku: product.sku, name: product.name, unitPrice: product.price, currency: product.currency, category: product.categoryName })} currency={product.currency} />
      </div>
    </li>
  );
}
