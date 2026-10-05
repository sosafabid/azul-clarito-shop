import { AddImagesForm } from "@/components/admin/AddImagesForm";
import { ProductImage } from "@/components/shop/ProductImage";
import { MAX_IMAGES_PER_PRODUCT } from "@/domain/images";
import { addImagesAction, moveImageAction, removeImageAction, setPrimaryImageAction, updateImageAltAction } from "@/server/actions/product-images";
import type { AdminImage } from "@/server/services/catalog/admin-images";

const smallButton =
  "inline-flex min-h-9 items-center rounded-full border-2 border-navy px-3 py-1 font-display text-xs font-bold text-navy hover:bg-navy hover:text-paper";

/** Galería del producto: solo referencias (URL); los archivos viven en almacenamiento externo. */
export function ImagesManager({ productId, productName, images, uploadsEnabled }: { productId: string; productName: string; images: AdminImage[]; uploadsEnabled: boolean }) {
  return (
    <section id="imagenes" className="scroll-mt-24 space-y-5 rounded-3xl border border-celeste bg-paper p-5 sm:p-7">
      <div>
        <h2 className="text-xl font-bold">Imágenes</h2>
        <p className="mt-1 text-sm text-ink/70">La principal se muestra primero en la tienda. {images.length}/{MAX_IMAGES_PER_PRODUCT} imágenes.</p>
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-ink/70">Todavía no hay imágenes: en la tienda se verá un marcador con la identidad de la marca.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <li key={image.id} className="space-y-3 rounded-2xl border border-celeste p-3">
              <ProductImage src={image.url} alt={image.alt ?? productName} className="rounded-xl" sizes="(min-width: 1024px) 20vw, 50vw" />
              <div className="flex flex-wrap items-center gap-2">
                {image.isPrimary ? (
                  <span className="rounded-full bg-aqua/25 px-2.5 py-0.5 font-display text-xs font-bold text-navy">Principal</span>
                ) : (
                  <form action={setPrimaryImageAction.bind(null, productId, image.id)}>
                    <button type="submit" className={smallButton}>Hacer principal</button>
                  </form>
                )}
                <form action={moveImageAction.bind(null, productId, image.id, "up")}>
                  <button type="submit" disabled={index === 0} aria-label="Subir" className={`${smallButton} disabled:opacity-40`}>↑</button>
                </form>
                <form action={moveImageAction.bind(null, productId, image.id, "down")}>
                  <button type="submit" disabled={index === images.length - 1} aria-label="Bajar" className={`${smallButton} disabled:opacity-40`}>↓</button>
                </form>
                <form action={removeImageAction.bind(null, productId, image.id)}>
                  <button type="submit" className="inline-flex min-h-9 items-center rounded-full border-2 border-coral px-3 py-1 font-display text-xs font-bold text-navy hover:bg-coral/15">Quitar</button>
                </form>
              </div>
              <form action={updateImageAltAction.bind(null, productId, image.id)} className="flex gap-2">
                <input name="alt" defaultValue={image.alt ?? ""} maxLength={200} aria-label="Texto alternativo" placeholder="Texto alternativo (accesibilidad)" className="min-w-0 flex-1 rounded-xl border-2 border-celeste bg-paper px-3 py-1.5 text-sm" />
                <button type="submit" className={smallButton}>Guardar</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <AddImagesForm action={addImagesAction.bind(null, productId)} remaining={MAX_IMAGES_PER_PRODUCT - images.length} uploadsEnabled={uploadsEnabled} />
    </section>
  );
}
