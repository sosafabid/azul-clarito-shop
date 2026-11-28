"use client";

import { openConsentPanel } from "@/lib/analytics/consent";

/** Abre el panel para cambiar o retirar el permiso de cookies opcionales. */
export function CookiePreferencesButton({ className, children = "Preferencias de cookies" }: { className?: string; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={openConsentPanel} className={className}>
      {children}
    </button>
  );
}
