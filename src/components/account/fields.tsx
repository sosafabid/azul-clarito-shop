import { cn } from "@/lib/utils";

export const inputClass =
  "w-full rounded-xl border-2 border-celeste bg-paper px-4 py-3 text-ink placeholder:text-ink/40 focus:border-aqua focus:outline-none";

/** Campo de formulario con etiqueta, ayuda y error accesible. */
export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block font-display text-sm font-bold text-navy">
        {label}
        <span className="mt-1.5 block font-sans font-normal">{children}</span>
      </label>
      {hint && !error && <p className="mt-1 text-xs text-ink/60">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs font-semibold text-coral">
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ pending, children, pendingLabel, tone = "navy" }: { pending: boolean; children: React.ReactNode; pendingLabel: string; tone?: "navy" | "coral" }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex min-h-12 w-full items-center justify-center rounded-full px-8 py-3 font-display font-bold transition-colors disabled:opacity-60 sm:w-auto",
        tone === "navy" ? "bg-navy text-paper hover:bg-ink" : "bg-coral text-navy hover:bg-coral/80",
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
