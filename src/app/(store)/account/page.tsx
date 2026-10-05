import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = {
  title: "Mi cuenta",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <ComingSoon
      title="Mi cuenta"
      description="Muy pronto vas a poder crear tu cuenta, guardar tus direcciones y revisar tus pedidos."
    />
  );
}
