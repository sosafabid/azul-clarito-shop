import { cn } from "@/lib/utils";

type ContainerProps = React.ComponentPropsWithoutRef<"div"> & {
  /** `narrow` para textos largos y formularios. */
  size?: "default" | "narrow";
};

export function Container({ size = "default", className, ...props }: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 sm:px-8",
        size === "narrow" ? "max-w-3xl" : "max-w-6xl",
        className,
      )}
      {...props}
    />
  );
}
