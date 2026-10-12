"use client";

import { upload } from "@vercel/blob/client";
import { useState } from "react";
import { Notice } from "@/components/admin/Notice";
import { DIGITAL_FILE, digitalStorageKey, type StorageProbe } from "@/domain/fulfillment";
import { attachDigitalAssetAction, testDigitalStorageAction } from "@/server/actions/digital-assets";

/**
 * Archivo PDF de un producto digital. El navegador sube el archivo DIRECTO al almacén privado (con un permiso que emite
 * /api/admin/digital-assets/upload) para no chocar con el límite de ~4,5 MB de las funciones de Vercel. Luego el servidor lo lee,
 * comprueba que sea un PDF y lo vincula. El archivo nunca tiene una URL pública.
 */
export type DigitalAssetView = { fileName: string; sizeBytes: number; sha256: string; createdAt: string } | null;

/** Mensaje claro para un error del navegador al subir (los errores del SDK llegan como texto en inglés). */
function describeUploadError(error: unknown): string {
  const text = error instanceof Error ? error.message : "";
  if (/too large/i.test(text)) return `El PDF supera el tamaño máximo (${DIGITAL_FILE.maxBytes / 1024 / 1024} MB).`;
  if (/content type/i.test(text)) return "El almacén rechazó el archivo: solo se aceptan PDF.";
  if (/token has expired/i.test(text)) return "El permiso de subida venció. Probá de nuevo.";
  if (/aborted/i.test(text)) return "La subida se cortó. Revisá tu conexión y probá de nuevo.";
  if (/access denied|valid token/i.test(text)) return "El almacén rechazó el token. Usá el botón «Probar almacenamiento» para ver qué falla.";
  if (/store does not exist|suspended/i.test(text)) return "El almacén no existe o está suspendido. Usá «Probar almacenamiento» para ver el detalle.";
  if (/client token/i.test(text)) return "El servidor no autorizó la subida (sesión vencida, sin permiso, producto no digital o almacenamiento sin configurar). Usá «Probar almacenamiento».";
  return "No se pudo subir el archivo. Revisá tu conexión y usá «Probar almacenamiento» para verificar la configuración.";
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function DigitalAssetManager({ productId, asset, storageReady, sales }: { productId: string; asset: DigitalAssetView; storageReady: boolean; sales: number }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [probe, setProbe] = useState<StorageProbe | null>(null);
  const [probing, setProbing] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    if (file.size <= 0 || file.size > DIGITAL_FILE.maxBytes) return setMessage({ tone: "error", text: `El PDF debe pesar hasta ${DIGITAL_FILE.maxBytes / 1024 / 1024} MB.` });
    if (file.type !== DIGITAL_FILE.contentType && !file.name.toLowerCase().endsWith(".pdf")) return setMessage({ tone: "error", text: "Solo se aceptan archivos PDF." });
    if (asset && sales > 0 && !window.confirm(`Este libro ya tiene ${sales} venta(s). Las clientas que descarguen desde ahora recibirán la versión nueva. ¿Reemplazar el archivo?`)) return;
    setBusy(true);
    setProgress(0);
    try {
      const pathname = digitalStorageKey(productId, crypto.randomUUID());
      const blob = await upload(pathname, file, {
        access: "private",
        handleUploadUrl: "/api/admin/digital-assets/upload",
        clientPayload: productId,
        contentType: DIGITAL_FILE.contentType,
        multipart: file.size > 8 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });
      const result = await attachDigitalAssetAction(productId, blob.pathname, file.name);
      setMessage({ tone: result.ok ? "success" : "error", text: result.message });
    } catch (error) {
      setMessage({ tone: "error", text: describeUploadError(error) });
    } finally {
      setBusy(false);
    }
  }

  async function onProbe() {
    setProbing(true);
    setProbe(null);
    try {
      setProbe(await testDigitalStorageAction());
    } catch {
      setProbe({ ok: false, message: "No se pudo ejecutar la prueba: tu sesión pudo haber vencido o no tenés permiso. Ingresá de nuevo.", steps: [] });
    } finally {
      setProbing(false);
    }
  }

  return (
    <section id="archivo-digital" className="scroll-mt-24 space-y-4 rounded-3xl border border-celeste bg-paper p-5 sm:p-7">
      <div>
        <h2 className="text-xl font-bold">Archivo digital (PDF)</h2>
        <p className="mt-1 text-sm text-ink/70">Se guarda en un almacén privado: no tiene enlace público. Las clientas lo descargan con enlaces temporales, solo después de que el pago esté confirmado.</p>
      </div>
      {!storageReady && <Notice tone="warning">Falta configurar el almacenamiento privado (variable <code>DIGITAL_BLOB_READ_WRITE_TOKEN</code>). Sin eso no se pueden subir ni entregar PDF.</Notice>}
      {asset ? (
        <dl className="grid gap-3 rounded-2xl bg-celeste/35 p-4 text-sm sm:grid-cols-3">
          <div><dt className="font-bold text-ink/60">Archivo</dt><dd className="break-all font-semibold text-navy">{asset.fileName}</dd></div>
          <div><dt className="font-bold text-ink/60">Tamaño</dt><dd className="font-semibold text-navy">{mb(asset.sizeBytes)}</dd></div>
          <div><dt className="font-bold text-ink/60">Huella SHA-256</dt><dd className="font-mono text-xs text-navy">{asset.sha256.slice(0, 16)}…</dd></div>
        </dl>
      ) : (
        <Notice tone="warning">Todavía no hay PDF: el producto no se puede publicar ni comprar hasta que lo subas.</Notice>
      )}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <label className="block">
        <span className="mb-1.5 block font-display text-sm font-bold text-navy">{asset ? "Reemplazar el PDF" : "Subir el PDF"}</span>
        <input type="file" accept="application/pdf,.pdf" disabled={busy || !storageReady} onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-navy file:px-5 file:py-2.5 file:font-display file:font-bold file:text-paper disabled:opacity-60" />
      </label>
      <div className="space-y-3">
        <button type="button" onClick={() => void onProbe()} disabled={probing || busy || !storageReady} className="rounded-full border border-navy px-5 py-2 font-display text-sm font-bold text-navy hover:bg-celeste/40 disabled:opacity-60">
          {probing ? "Probando…" : "Probar almacenamiento"}
        </button>
        {probe && (
          <Notice tone={probe.ok ? "success" : "error"}>
            <span className="block font-semibold">{probe.message}</span>
            {probe.steps.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-sm">
                {probe.steps.map((step) => (
                  <li key={step.name}>{step.ok ? "✓" : "✗"} {step.name}</li>
                ))}
              </ul>
            )}
          </Notice>
        )}
      </div>
      {busy && <p role="status" className="text-sm font-semibold text-navy">Subiendo… {progress}%</p>}
    </section>
  );
}
