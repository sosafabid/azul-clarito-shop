import Link from "next/link";
import { ArrowLeftIcon, HibiscusIcon } from "@/components/ui/icons";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { cn } from "@/lib/utils";

type ComingSoonProps = {
  title: string;
  description: string;
  eyebrow?: string;
  /** Enlace de regreso. */
  back?: { label: string; href: string };
  /** `compact` para usarlo dentro del panel administrativo. */
  compact?: boolean;
};

/** Estado "Próximamente" reutilizable para las rutas aún no implementadas. */
export function ComingSoon({
  title,
  description,
  eyebrow = "Próximamente",
  back = { label: "Volver al inicio", href: "/" },
  compact = false,
}: ComingSoonProps) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden bg-gradient-to-b from-celeste/60 via-paper to-paper",
        compact ? "rounded-3xl border border-celeste" : "",
      )}
    >
      <div
        aria-hidden="true"
        className="absolute -right-24 -top-24 -z-10 size-72 rounded-full bg-sun/30 blur-3xl"
      />
      <div
        className={cn(
          "mx-auto flex max-w-2xl flex-col items-center px-6 text-center",
          compact ? "py-16" : "py-24 sm:py-32",
        )}
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-celeste px-4 py-1.5 font-display text-xs font-bold uppercase tracking-[0.14em] text-navy">
          <HibiscusIcon className="size-4 text-coral" />
          {eyebrow}
        </span>
        <h1 className="mt-6 text-4xl font-bold sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink/80">{description}</p>
        <Link
          href={back.href}
          className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-navy px-6 py-2.5 font-display text-sm font-bold text-navy transition-colors hover:bg-navy hover:text-paper"
        >
          <ArrowLeftIcon className="size-4" />
          {back.label}
        </Link>
      </div>
      {!compact && <WaveDivider className="fill-celeste/50" />}
    </section>
  );
}
