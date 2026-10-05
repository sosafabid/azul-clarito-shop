import { ComingSoon } from "@/components/ui/ComingSoon";

export default function NotFound() {
  return (
    <ComingSoon
      eyebrow="Error 404"
      title="No encontramos esa página"
      description="Es posible que el enlace haya cambiado o que todavía no exista."
      back={{ label: "Volver al inicio", href: "/" }}
    />
  );
}
