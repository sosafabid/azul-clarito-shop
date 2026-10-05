import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CategoryTileProps = {
  title: string;
  icon: ReactNode;
  /** Clases de color de fondo del bloque. */
  tone: string;
};

/** Bloque placeholder de una futura sección de la tienda (sin productos reales). */
export function CategoryTile({ title, icon, tone }: CategoryTileProps) {
  return (
    <li
      className={cn(
        "group relative flex min-h-56 flex-col justify-between overflow-hidden rounded-3xl p-7 text-navy transition-transform duration-300 motion-safe:hover:-translate-y-1",
        tone,
      )}
    >
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-paper/70 text-navy">
        {icon}
      </span>
      <div>
        <h3 className="font-display text-2xl font-bold">{title}</h3>
        <p className="mt-3 inline-flex rounded-full bg-paper/80 px-3 py-1 font-display text-xs font-bold uppercase tracking-[0.12em]">
          Próximamente
        </p>
      </div>
    </li>
  );
}
