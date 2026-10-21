import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Bloques de sección de la portada. Dos formatos:
 *  - `ImageTile`: la imagen de la sección ya trae el título, el texto y el botón; el bloque entero es el enlace.
 *  - `ContentTile`: bloque de color con texto y fotos (para las secciones que aún no tienen imagen propia).
 * En pantallas grandes cada fila reparte el ancho según la proporción de sus imágenes, así todas quedan de la misma altura.
 */
type LinkProps = { href: string; external?: boolean; label: string; children: ReactNode; className?: string; style?: CSSProperties };

function TileLink({ href, external, label, children, className, style }: LinkProps) {
  const shared = { className: cn("group relative block h-full overflow-hidden rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy", className), style, "aria-label": label };
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" {...shared}>{children}</a>
  ) : (
    <Link href={href} {...shared}>{children}</Link>
  );
}

const grow = (ratio: number) => ({ "--g": ratio }) as CSSProperties;

export function ImageTile({ src, width, height, alt, href, external, label }: { src: string; width: number; height: number; alt: string; href: string; external?: boolean; label: string }) {
  const ratio = width / height;
  return (
    <li className="lg:[flex:var(--g)_1_0%]" style={grow(ratio)}>
      <TileLink href={href} external={external} label={label} className="transition-transform duration-300 motion-safe:hover:-translate-y-1">
        <Image src={src} alt={alt} width={width} height={height} sizes="(min-width: 1024px) 45vw, 100vw" className="block h-auto w-full lg:h-full object-cover" />
      </TileLink>
    </li>
  );
}

export function ContentTile({
  title,
  description,
  href,
  cta,
  tone,
  ratio = 1.3,
  photos,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  tone: string;
  ratio?: number;
  photos: { src: string; alt: string }[];
}) {
  return (
    <li className="lg:[flex:var(--g)_1_0%]" style={grow(ratio)}>
      <TileLink href={href} label={`${title}: ${description}`} className={cn("flex min-h-64 flex-col justify-between gap-6 p-7 text-navy transition-transform duration-300 motion-safe:hover:-translate-y-1 sm:flex-row sm:items-center sm:p-9", tone)}>
        <div className="sm:max-w-[14rem]">
          <h3 className="font-display text-3xl font-bold sm:text-4xl">{title}</h3>
          <p className="mt-3 leading-snug text-navy/80">{description}</p>
          <p className="mt-5 inline-flex rounded-full bg-paper/85 px-5 py-2.5 font-display text-sm font-bold uppercase tracking-[0.14em]">{cta} →</p>
        </div>
        <span className="flex gap-3 sm:ml-auto">
          {photos.map((photo, i) => (
            <Image
              key={photo.src}
              src={photo.src}
              alt={photo.alt}
              width={240}
              height={300}
              sizes="(min-width: 1024px) 12rem, 40vw"
              className={cn("aspect-[4/5] w-full max-w-36 rounded-2xl border-2 border-paper/80 object-cover shadow-md sm:w-32 lg:w-36", i === 1 && "mt-6")}
            />
          ))}
        </span>
      </TileLink>
    </li>
  );
}
