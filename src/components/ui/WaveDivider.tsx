import { cn } from "@/lib/utils";

type WaveDividerProps = {
  /** Clase de Tailwind con el color de relleno (p. ej. "fill-paper"). */
  className?: string;
  flip?: boolean;
};

/** Ola decorativa para unir secciones (inspirada en el mar de Azul Clarito). */
export function WaveDivider({ className = "fill-paper", flip = false }: WaveDividerProps) {
  return (
    <svg
      viewBox="0 0 1440 90"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("block h-[48px] w-full sm:h-[72px]", flip && "rotate-180", className)}
    >
      <path d="M0,45 C240,95 480,0 720,30 C960,60 1200,5 1440,45 L1440,90 L0,90 Z" />
    </svg>
  );
}
