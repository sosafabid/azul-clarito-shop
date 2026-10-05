import { cn } from "@/lib/utils";
import type { ProductStatus } from "@/domain/catalog";
import { PRODUCT_ACTION_RULES, availableActions, type ProductAction } from "@/domain/product-lifecycle";
import { productLifecycleAction } from "@/server/actions/products";

const styles: Record<ProductAction, string> = {
  publish: "bg-navy text-paper hover:bg-ink",
  hide: "border-2 border-navy text-navy hover:bg-navy hover:text-paper",
  archive: "border-2 border-coral text-navy hover:bg-coral/15",
  restore: "border-2 border-navy text-navy hover:bg-navy hover:text-paper",
};

/**
 * Botones de estado según el estado actual (Activo: ocultar/archivar · Oculto:
 * publicar/archivar · Archivado: restaurar). Cada botón es un formulario que llama
 * a una Server Action que vuelve a comprobar el permiso en el servidor.
 */
export function ProductActionButtons({
  id,
  status,
  returnTo,
  compact = false,
}: {
  id: string;
  status: ProductStatus;
  returnTo: string;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {availableActions(status).map((action) => (
        <form key={action} action={productLifecycleAction.bind(null, id, action, returnTo)}>
          <button
            type="submit"
            className={cn(
              "inline-flex items-center rounded-full font-display font-bold transition-colors",
              compact ? "min-h-9 px-3.5 py-1.5 text-xs" : "min-h-11 px-5 py-2 text-sm",
              styles[action],
            )}
          >
            {PRODUCT_ACTION_RULES[action].label}
          </button>
        </form>
      ))}
    </div>
  );
}
