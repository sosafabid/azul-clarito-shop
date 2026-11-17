import Image from "next/image";
import { cn } from "@/lib/utils";
import type { BlogPost } from "@/domain/blog";

/**
 * Portada de un artículo: SIEMPRE 16:9, recortada con object-fit: cover (nunca deformada) y con el encuadre del artículo.
 * Se usa igual en la tarjeta del índice y en la cabecera del artículo, para que la misma foto aparezca en ambos.
 */
export function PostCover({ post, sizes, priority = false, className, imageClassName }: { post: BlogPost; sizes: string; priority?: boolean; className?: string; imageClassName?: string }) {
  return (
    <div className={cn("relative aspect-[16/9] w-full overflow-hidden bg-celeste/40", className)}>
      <Image
        src={post.image.src}
        alt={post.image.alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", imageClassName)}
        style={{ objectPosition: post.image.position ?? "50% 50%" }}
      />
    </div>
  );
}
