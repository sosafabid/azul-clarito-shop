import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonLinkProps = Omit<React.ComponentPropsWithoutRef<typeof Link>, "href"> & {
  href: string;
  variant?: "solid" | "outline" | "light";
};

const variants = {
  solid: "bg-navy text-paper hover:bg-ink",
  outline: "border-2 border-navy text-navy hover:bg-navy hover:text-paper",
  light: "bg-paper text-navy hover:bg-celeste",
} as const;

/** Enlace con aspecto de botón (navegación interna o externa). */
export function ButtonLink({ href, variant = "solid", className, ...props }: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 py-3 font-display text-base font-bold transition-colors",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
