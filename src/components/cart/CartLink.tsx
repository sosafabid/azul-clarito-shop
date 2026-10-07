import Link from "next/link";
import { CartIcon } from "@/components/ui/icons";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";
import { getCartCount } from "@/server/services/cart/request";

/** Icono del carrito con el total de UNIDADES (A×2 + B×3 = 5). */
/** `count = null` es el estado provisional mientras llega el dato real: sin número, para no mostrar un "0" falso. */
export function CartLinkView({ count }: { count: number | null }) {
  const label = count === null ? "Carrito" : count === 0 ? "Carrito, vacío" : `Carrito, ${count} ${count === 1 ? "unidad" : "unidades"}`;
  return (
    <Link href={routes.cart} aria-label={label} className="relative inline-flex size-11 items-center justify-center rounded-full text-navy hover:bg-celeste/60">
      <CartIcon className="size-6" />
      {count !== null && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute right-0.5 top-0.5 inline-flex min-w-5 items-center justify-center rounded-full px-1 font-display text-[11px] font-bold leading-5",
            count > 0 ? "bg-navy text-paper" : "bg-celeste text-navy",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

/** Se renderiza en el servidor: el número siempre sale de la base de datos, no de algo guardado en el navegador. */
export async function CartLink() {
  return <CartLinkView count={await getCartCount()} />;
}
