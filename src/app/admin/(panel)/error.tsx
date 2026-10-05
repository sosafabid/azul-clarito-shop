"use client";

import { Notice } from "@/components/admin/Notice";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-4">
      <Notice tone="error">
        No se pudieron cargar los datos. Revisá la conexión a la base de datos (<code>DATABASE_URL</code>) e intentá de nuevo.
      </Notice>
      <button
        type="button"
        onClick={reset}
        className="rounded-full border-2 border-navy px-6 py-2.5 font-display text-sm font-bold text-navy hover:bg-navy hover:text-paper"
      >
        Reintentar
      </button>
    </div>
  );
}
