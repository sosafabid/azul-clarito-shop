import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Administración", template: "%s · Administración" },
  robots: { index: false, follow: false },
};

/**
 * Layout común de TODO /admin. No protege nada por sí solo: la autorización
 * está en `(panel)/layout.tsx` (páginas) y en cada Server Action. El login vive
 * fuera de `(panel)` para poder abrirse sin sesión.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
