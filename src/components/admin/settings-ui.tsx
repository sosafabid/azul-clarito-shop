import { cn } from "@/lib/utils";

export const inputClass = "w-full rounded-xl border-2 border-celeste bg-paper px-3 py-2 text-sm text-ink focus:border-aqua focus:outline-none";
export const card = "rounded-3xl border border-celeste bg-paper p-5 sm:p-7";
export const primaryButton = "inline-flex min-h-10 items-center rounded-full bg-navy px-5 py-2 font-display text-sm font-bold text-paper hover:bg-ink";
export const ghostButton = "inline-flex min-h-9 items-center rounded-full border-2 border-navy px-4 py-1 font-display text-xs font-bold text-navy hover:bg-navy hover:text-paper";
export const dangerButton = "inline-flex min-h-9 items-center rounded-full border-2 border-coral px-4 py-1 font-display text-xs font-bold text-navy hover:bg-coral/15";

export function Fld({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block font-display text-xs font-bold text-navy", className)}>
      {label}
      <span className="mt-1 block font-sans font-normal">{children}</span>
      {hint && <span className="mt-1 block text-[11px] font-normal text-ink/60">{hint}</span>}
    </label>
  );
}
