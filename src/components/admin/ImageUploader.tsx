"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Notice } from "@/components/ui/Notice";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGES_PER_PRODUCT, parseImageUrl, validateImageFile } from "@/domain/images";

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

const ENDPOINT = "/api/admin/product-images";
const smallButton =
  "inline-flex min-h-9 items-center rounded-full border-2 border-navy px-3 py-1 font-display text-xs font-bold text-navy hover:bg-navy hover:text-paper disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-navy";
const dangerSmall = "inline-flex min-h-9 items-center rounded-full border-2 border-coral px-3 py-1 font-display text-xs font-bold text-navy hover:bg-coral/15";

type Status = "uploading" | "done" | "error";
type Item = {
  id: string;
  name: string;
  size: number;
  /** Vista previa local (antes de subir) o la URL externa. */
  preview: string;
  status: Status;
  progress: number;
  error?: string;
  /** Un archivo rechazado por el navegador no se puede reintentar: hay que elegir otro. */
  retryable: boolean;
  file?: File;
  url?: string;
  storageKey?: string;
  external?: boolean;
};

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
const uid = () => Math.random().toString(36).slice(2);

function sendFile(file: File, productId: string | undefined, onProgress: (percent: number) => void): Promise<{ ok: true; url: string; storageKey: string } | { ok: false; message: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", ENDPOINT);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => resolve({ ok: false, message: "No hay conexión con el servidor. Revisá tu internet y reintentá." });
    xhr.ontimeout = () => resolve({ ok: false, message: "La subida tardó demasiado. Reintentá." });
    xhr.onload = () => {
      let body: { ok?: boolean; message?: string; url?: string; storageKey?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* respuesta no JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.ok && body.url && body.storageKey) resolve({ ok: true, url: body.url, storageKey: body.storageKey });
      else resolve({ ok: false, message: body.message ?? (xhr.status === 401 ? "Tu sesión venció. Ingresá de nuevo." : "No se pudo subir la imagen. Reintentá.") });
    };
    xhr.timeout = 60_000;
    const form = new FormData();
    form.append("file", file);
    if (productId) form.append("productId", productId);
    xhr.send(form);
  });
}

/**
 * Subida de imágenes de producto: elegir o arrastrar varias, vista previa, progreso, reintento.
 *
 *  · modo "edit": cada imagen se sube y queda guardada en el producto (la galería de arriba se actualiza).
 *  · modo "create": las imágenes se suben a una carpeta pendiente y se vinculan al guardar el producto; aquí se
 *    puede elegir la principal (la primera), cambiar el orden y quitar. La lista viaja en el campo oculto `imageItems`.
 * Toda la seguridad está en el servidor (/api/admin/product-images): esto solo mejora la experiencia.
 */
export function ImageUploader({
  mode,
  productId,
  uploadsEnabled,
  slots = MAX_IMAGES_PER_PRODUCT,
  onBusyChange,
}: {
  mode: "create" | "edit";
  productId?: string;
  uploadsEnabled: boolean;
  /** Cuántas imágenes más admite el producto. */
  slots?: number;
  onBusyChange?: (busy: boolean) => void;
}) {
  const router = useRouter();
  const inputId = useId();
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [urlText, setUrlText] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const itemsRef = useRef<Item[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const patch = useCallback((id: string, change: Partial<Item>) => setItems((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item))), []);

  const startUpload = useCallback(
    async (id: string, file: File) => {
      patch(id, { status: "uploading", progress: 0, error: undefined });
      const result = await sendFile(file, mode === "edit" ? productId : undefined, (progress) => patch(id, { progress }));
      if (result.ok) patch(id, { status: "done", progress: 100, url: result.url, storageKey: result.storageKey });
      else patch(id, { status: "error", error: result.message });
    },
    [mode, patch, productId],
  );

  const counted = items.filter((item) => item.status !== "error").length;
  const capacity = mode === "edit" ? slots : MAX_IMAGES_PER_PRODUCT;

  function addFiles(list: FileList | File[]) {
    setNotice(null);
    const files = Array.from(list);
    if (files.length === 0) return;
    let room = capacity - counted;
    const fresh: Item[] = [];
    const toUpload: Item[] = [];
    let skipped = 0;
    for (const file of files) {
      const problem = validateImageFile(file);
      if (problem) {
        fresh.push({ id: uid(), name: file.name, size: file.size, preview: "", status: "error", progress: 0, error: problem, retryable: false });
        continue;
      }
      if (room <= 0) {
        skipped += 1;
        continue;
      }
      room -= 1;
      const item: Item = { id: uid(), name: file.name, size: file.size, preview: URL.createObjectURL(file), status: "uploading", progress: 0, retryable: true, file };
      fresh.push(item);
      toUpload.push(item);
    }
    if (skipped > 0) setNotice(`Máximo ${capacity} imágenes más para este producto: ${skipped === 1 ? "una quedó fuera" : `${skipped} quedaron fuera`}.`);
    setItems((current) => [...current, ...fresh]);
    for (const item of toUpload) void startUpload(item.id, item.file!);
  }

  async function remove(item: Item) {
    if (item.preview.startsWith("blob:")) URL.revokeObjectURL(item.preview);
    setItems((current) => current.filter((other) => other.id !== item.id));
    // Una imagen pendiente que se descarta se borra del almacenamiento (no queda un archivo sobrante).
    if (mode === "create" && item.status === "done" && item.storageKey && item.url) {
      try {
        await fetch(ENDPOINT, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: item.url, storageKey: item.storageKey }) });
      } catch {
        /* sobrante inofensivo: lo limpia el script de limpieza */
      }
    }
  }

  function move(id: string, to: "up" | "down" | "first") {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      if (index < 0) return current;
      const target = to === "first" ? 0 : to === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= current.length || target === index) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  }

  function addUrl() {
    setUrlError(null);
    const parsed = parseImageUrl(urlText);
    if (!parsed.ok) return setUrlError(parsed.error);
    if (counted >= capacity) return setUrlError(`Máximo ${MAX_IMAGES_PER_PRODUCT} imágenes por producto.`);
    if (items.some((item) => item.url === parsed.url)) return setUrlError("Esa URL ya está en la lista.");
    setItems((current) => [...current, { id: uid(), name: parsed.url, size: 0, preview: parsed.url, status: "done", progress: 100, retryable: false, url: parsed.url, external: true }]);
    setUrlText("");
  }

  const busy = items.some((item) => item.status === "uploading");
  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);

  // Modo edición: cuando termina la tanda, se actualiza la galería guardada y se limpia la lista de subidas.
  const doneCount = items.filter((item) => item.status === "done").length;
  useEffect(() => {
    if (mode !== "edit" || busy || doneCount === 0) return;
    router.refresh();
    const timer = setTimeout(() => setItems((current) => current.filter((item) => item.status !== "done")), 1200);
    return () => clearTimeout(timer);
  }, [mode, busy, doneCount, router]);

  // Libera las vistas previas al salir.
  useEffect(() => () => itemsRef.current.forEach((item) => item.preview.startsWith("blob:") && URL.revokeObjectURL(item.preview)), []);

  const payload = JSON.stringify(items.filter((item) => item.status === "done" && item.url).map((item) => (item.storageKey ? { url: item.url, storageKey: item.storageKey } : { url: item.url })));
  const full = counted >= capacity;

  return (
    <div className="space-y-4">
      {mode === "create" && <input type="hidden" name="imageItems" value={payload} />}
      {!uploadsEnabled && <StorageSetupNotice />}

      <div
        onDragOver={(event) => {
          if (!uploadsEnabled || full) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (uploadsEnabled && !full) addFiles(event.dataTransfer.files);
        }}
        className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${dragging ? "border-aqua bg-aqua/15" : "border-celeste bg-celeste/20"} ${!uploadsEnabled || full ? "opacity-60" : ""}`}
      >
        <label htmlFor={inputId} className={`inline-flex min-h-11 items-center rounded-full bg-navy px-6 py-2 font-display text-sm font-bold text-paper focus-within:ring-2 focus-within:ring-aqua ${!uploadsEnabled || full ? "cursor-not-allowed" : "cursor-pointer hover:bg-ink"}`}>
          Elegir imágenes
        </label>
        <input
          id={inputId}
          type="file"
          multiple
          disabled={!uploadsEnabled || full}
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = ""; // permite volver a elegir el mismo archivo
          }}
        />
        <p className="mt-2 text-sm text-ink/75">…o arrastralas hasta acá.</p>
        <p className="mt-1 text-xs text-ink/60">
          Formatos: JPG, PNG, WebP o AVIF · máximo {MAX_IMAGE_BYTES / 1024 / 1024} MB cada una · hasta {MAX_IMAGES_PER_PRODUCT} por producto.
          La primera es la principal, salvo que elijas otra. Se publican en la tienda cuando el producto esté publicado.
        </p>
      </div>

      <div aria-live="polite">{notice && <Notice tone="warning">{notice}</Notice>}</div>

      {items.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="upload-list">
          {items.map((item, index) => (
            <li key={item.id} className="space-y-2 rounded-2xl border border-celeste bg-paper p-3" data-status={item.status}>
              <div className="relative aspect-square overflow-hidden rounded-xl bg-celeste/40">
                {item.preview ? <Image src={item.preview} alt={`Vista previa de ${item.external ? "imagen externa" : item.name}`} fill sizes="200px" unoptimized className="object-cover" /> : null}
                {item.status === "uploading" && (
                  <div className="absolute inset-x-0 bottom-0 bg-paper/90 p-2" role="progressbar" aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Subiendo ${item.name}`}>
                    <div className="h-2 overflow-hidden rounded-full bg-celeste"><div className="h-full bg-aqua transition-all" style={{ width: `${item.progress}%` }} /></div>
                  </div>
                )}
              </div>
              <p className="truncate text-xs font-semibold text-navy" title={item.name}>{item.external ? "Imagen por URL" : item.name}{item.size > 0 && <span className="font-normal text-ink/60"> · {mb(item.size)}</span>}</p>
              {item.status === "uploading" && <p className="text-xs text-ink/70">Subiendo… {item.progress}%</p>}
              {item.status === "done" && (
                <p className="text-xs font-semibold text-navy">
                  ✓ {mode === "edit" ? "Guardada en el producto" : item.external ? "Lista" : "Subida"}
                  {mode === "create" && index === 0 && <span className="ml-2 rounded-full bg-aqua/25 px-2 py-0.5">Principal</span>}
                </p>
              )}
              {item.status === "error" && <p role="alert" className="text-xs font-semibold text-coral">{item.error}</p>}
              <div className="flex flex-wrap gap-2">
                {item.status === "error" && item.retryable && item.file && <button type="button" className={smallButton} onClick={() => void startUpload(item.id, item.file!)}>Reintentar</button>}
                {mode === "create" && item.status === "done" && (
                  <>
                    {index !== 0 && <button type="button" className={smallButton} onClick={() => move(item.id, "first")}>Hacer principal</button>}
                    <button type="button" className={smallButton} disabled={index === 0} aria-label="Subir en el orden" onClick={() => move(item.id, "up")}>↑</button>
                    <button type="button" className={smallButton} disabled={index === items.length - 1} aria-label="Bajar en el orden" onClick={() => move(item.id, "down")}>↓</button>
                  </>
                )}
                {item.status !== "uploading" && !(mode === "edit" && item.status === "done") && <button type="button" className={dangerSmall} onClick={() => void remove(item)}>Quitar</button>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {mode === "create" && (
        <div className="space-y-1.5">
          <label htmlFor={`${inputId}-url`} className="block text-sm font-bold text-navy">…o agregá una URL https</label>
          <div className="flex gap-2">
            <input
              id={`${inputId}-url`}
              value={urlText}
              onChange={(event) => setUrlText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addUrl();
                }
              }}
              placeholder="https://…"
              className="min-w-0 flex-1 rounded-xl border-2 border-celeste bg-paper px-4 py-2.5 text-ink focus:border-aqua focus:outline-none"
            />
            <button type="button" className={smallButton} onClick={addUrl}>Agregar URL</button>
          </div>
          {urlError && <p role="alert" className="text-xs font-semibold text-coral">{urlError}</p>}
        </div>
      )}
      {busy && <p className="text-xs font-semibold text-navy">Esperá a que terminen las subidas antes de guardar.</p>}
    </div>
  );
}
