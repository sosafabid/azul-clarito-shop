import Link from "next/link";
import { routes } from "@/config/routes";
import { formatMoney, toCurrency } from "@/domain/money";
import type { PublicProductListItem } from "@/types/catalog";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { ProductImage } from "./ProductImage";

export function ProductCard({ product }: { product: PublicProductListItem }) {
  return (
    <li>
      <Link
        href={routes.product(product.slug)}
        className="group flex h-full flex-col overflow-hidden rounded-3xl border border-celeste bg-paper transition-shadow hover:shadow-soft"
      >
        <ProductImage src={product.imageUrl} alt={product.imageAlt ?? product.name} className="transition-transform duration-300 motion-safe:group-hover:scale-[1.02]" />
        <div className="flex flex-1 flex-col gap-2 p-5">
          <div className="flex flex-wrap items-center gap-2">
            {product.isNew && (
              <span className="rounded-full bg-navy px-2.5 py-0.5 font-display text-xs font-bold text-paper">Nuevo</span>
            )}
            {product.isLimitedEdition && (
              <span className="rounded-full bg-sand px-2.5 py-0.5 font-display text-xs font-bold text-navy">Edición limitada</span>
            )}
          </div>
          <h3 className="font-display text-xl font-bold text-navy">{product.name}</h3>
          {product.shortDescription && <p className="text-sm leading-relaxed text-ink/75">{product.shortDescription}</p>}
          <div className="mt-auto flex items-center justify-between gap-3 pt-3">
            <span className="font-display text-lg font-bold text-navy">{formatMoney(product.price, toCurrency(product.currency))}</span>
            <AvailabilityBadge availability={product.availability} />
          </div>
        </div>
      </Link>
    </li>
  );
}
