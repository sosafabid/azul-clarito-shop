import { cn } from "@/lib/utils";

const tones = {
  info: "border-celeste bg-celeste/40 text-navy",
  success: "border-aqua/40 bg-aqua/15 text-navy",
  warning: "border-sun/60 bg-sun/25 text-navy",
  error: "border-coral/40 bg-coral/10 text-navy",
} as const;

export function Notice({
  tone = "info",
  children,
  className,
}: {
  tone?: keyof typeof tones;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-2xl border px-4 py-3 text-sm leading-relaxed", tones[tone], className)}>
      {children}
    </div>
  );
}
