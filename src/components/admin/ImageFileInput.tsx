"use client";

import { useState } from "react";
import { validateImageBatch } from "@/domain/images";
import { Notice } from "@/components/ui/Notice";

const inputClass = "w-full rounded-xl border-2 border-celeste bg-paper px-4 py-2.5 text-ink focus:border-aqua focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

/** Cuando falta el almacenamiento: explica en lenguaje simple cómo activarlo (y que por URL ya se puede). */
export function StorageSetupNotice() {
  return (
    <Notice tone="warning">
      <p className="font-bold">La subida de archivos todavía no está activada.</p>
      <p className="mt-1">Mientras tanto podés pegar la URL de la imagen. Para subir archivos desde acá:</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>
          En Vercel: tu proyecto → <strong>Storage</strong> → <strong>Create</strong> → <strong>Blob</strong> (acceso <strong>Público</strong>) → <strong>Connect</strong> al proyecto.
        </li>
        <li>
          Copiá la variable <code>BLOB_READ_WRITE_TOKEN</code> a tu <code>.env.local</code> (o corré <code>vercel env pull .env.local</code>).
        </li>
        <li>Reiniciá <code>npm run dev</code> (o volvé a desplegar).</li>
      </ol>
    </Notice>
  );
}

/**
 * Selector de archivos que revisa tipo y peso ANTES de enviar: así la persona ve el problema
 * enseguida, en lugar de esperar una subida que el servidor (o Vercel, que limita la petición
 * a ~4,5 MB) iba a rechazar.
 */
export function ImageFileInput({ name, disabled = false }: { name: string; disabled?: boolean }) {
  const [problem, setProblem] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ name: string; size: number }[]>([]);

  return (
    <div className="space-y-2">
      <input
        name={name}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        disabled={disabled}
        aria-describedby={`${name}-help`}
        className={inputClass}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          const found = files.length > 0 ? validateImageBatch(files) : null;
          if (found) {
            event.target.value = "";
            setSelected([]);
            setProblem(found);
            return;
          }
          setProblem(null);
          setSelected(files.map((file) => ({ name: file.name, size: file.size })));
        }}
      />
      <p id={`${name}-help`} className="text-xs text-ink/60">
        JPG, PNG, WebP o AVIF. Máximo 4 MB en total por envío (si es más pesada, reducila antes de subirla).
      </p>
      {selected.length > 0 && (
        <ul className="text-xs text-ink/75">
          {selected.map((file) => (
            <li key={file.name}>
              ✓ {file.name} · {mb(file.size)}
            </li>
          ))}
        </ul>
      )}
      {problem && (
        <p role="alert" className="text-sm font-semibold text-coral">
          {problem}
        </p>
      )}
    </div>
  );
}
