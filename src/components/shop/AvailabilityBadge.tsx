import { cn } from "@/lib/utils";
import type { ProductAvailability } from "@/types/catalog";

const styles: Record<ProductAvailability, { label: string; className: string }> = {
  in_stock: { label: "Disponible", className: "bg-aqua/25 text-navy" },
  low_stock: { label: "Últimas unidades", className: "bg-sun/50 text-navy" },
  out_of_stock: { label: "Agotado", className: "bg-coral/20 text-navy" },
};

export function AvailabilityBadge({ availability }: { availability: ProductAvailability }) {
  const style = styles[availability];
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 font-display text-xs font-bold", style.className)}>
      {style.label}
    </span>
  );
}
