import { cn } from "@/lib/utils";

const styles: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Activo", className: "bg-aqua/25 text-navy" },
  DRAFT: { label: "Oculto", className: "bg-sand/70 text-navy" },
  ARCHIVED: { label: "Archivado", className: "bg-blush/45 text-navy" },
};

export function ProductStatusBadge({ status }: { status: string }) {
  const style = styles[status] ?? { label: status, className: "bg-celeste text-navy" };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 font-display text-xs font-bold", style.className)}>
      {style.label}
    </span>
  );
}

const stockStyles = {
  ok: { label: "En stock", className: "bg-aqua/25 text-navy" },
  low: { label: "Stock bajo", className: "bg-sun/50 text-navy" },
  out: { label: "Sin stock", className: "bg-coral/20 text-navy" },
} as const;

export function StockStateBadge({ state }: { state: keyof typeof stockStyles }) {
  const style = stockStyles[state];
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 font-display text-xs font-bold", style.className)}>
      {style.label}
    </span>
  );
}
