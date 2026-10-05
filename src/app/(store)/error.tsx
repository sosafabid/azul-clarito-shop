"use client";

import { ComingSoon } from "@/components/ui/ComingSoon";

/** Si falla la base de datos, el visitante ve un mensaje amable (sin detalles técnicos). */
export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <>
      <ComingSoon
        eyebrow="Algo salió mal"
        title="No pudimos cargar esta página"
        description="Intentá de nuevo en unos segundos."
      />
      <div className="-mt-12 pb-16 text-center">
        <button
          type="button"
          onClick={reset}
          className="rounded-full border-2 border-navy px-6 py-2.5 font-display text-sm font-bold text-navy hover:bg-navy hover:text-paper"
        >
          Reintentar
        </button>
      </div>
    </>
  );
}
