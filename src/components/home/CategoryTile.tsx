import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CategoryTileProps = {
  title: string;
  description: string;
  icon: ReactNode;
  /** Clases de color de fondo del bloque. */
  tone: string;
  /** Si hay enlace, el bloque entero es clicable; si no, se muestra "Próximamente". */
  href?: string;
  external?: boolean;
  cta?: string;
  /** Fotos pequeñas que reemplazan al icono (p. ej. jabones y cuadros). */
  photos?: { src: string; alt: string }[];
};

const base =
  "group relative flex h-full min-h-56 flex-col justify-between gap-6 overflow-hidden rounded-3xl p-7 text-navy transition-transform duration-300";

/** Bloque de una sección de la tienda. Con `href` lleva a la sección; sin él, anuncia que viene pronto. */
export function CategoryTile({ title, description, icon, tone, href, external, cta, photos }: CategoryTileProps) {
  const body = (
    <>
      {photos && photos.length > 0 ? (
        <span className="flex gap-3">
          {photos.map((photo) => (
            <Image key={photo.src} src={photo.src} alt={photo.alt} width={240} height={300} sizes="96px" className="h-28 w-20 rounded-2xl border-2 border-paper/80 object-cover" />
          ))}
        </span>
      ) : (
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-paper/70 text-navy">{icon}</span>
      )}
      <div>
        <h3 className="font-display text-2xl font-bold">{title}</h3>
        <p className="mt-2 text-sm leading-snug text-navy/80">{description}</p>
        <p className="mt-3 inline-flex rounded-full bg-paper/80 px-3 py-1 font-display text-xs font-bold uppercase tracking-[0.12em]">
          {href ? `${cta ?? "Ver"} →` : "Próximamente"}
        </p>
      </div>
    </>
  );
  return (
    <li>
      {href ? (
        external ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className={cn(base, tone, "motion-safe:hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy")}>{body}</a>
        ) : (
          <Link href={href} className={cn(base, tone, "motion-safe:hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy")}>{body}</Link>
        )
      ) : (
        <div className={cn(base, tone)}>{body}</div>
      )}
    </li>
  );
}
