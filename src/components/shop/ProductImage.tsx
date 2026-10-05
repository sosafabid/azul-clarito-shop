import Image from "next/image";
import { BagIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * Imagen de producto, o un fondo con la identidad de la marca si todavía no hay.
 * Las imágenes viven en almacenamiento externo (aún sin definir): `unoptimized`
 * evita exigir un dominio en `next.config.ts`. Cuando se elija el CDN conviene
 * agregarlo a `images.remotePatterns` y quitar `unoptimized`.
 */
export function ProductImage({
  src,
  alt,
  className,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
}: {
  src: string | null;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  return (
    <div className={cn("relative aspect-square overflow-hidden bg-gradient-to-br from-celeste via-celeste/60 to-sand/60", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} unoptimized className="object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center text-navy/40" role="img" aria-label={alt}>
          <BagIcon className="size-14" />
        </div>
      )}
    </div>
  );
}
