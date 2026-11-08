"use client";

import { useState } from "react";
import { ProductImage } from "@/components/shop/ProductImage";
import { cn } from "@/lib/utils";

export type GalleryImage = { id: string; url: string; alt: string };

/**
 * Galería de la ficha de producto: la imagen grande cambia al tocar una miniatura
 * (con teclado también: cada miniatura es un botón). Con una sola foto no muestra miniaturas.
 */
export function ProductGallery({ images, productName }: { images: GalleryImage[]; productName: string }) {
  const [selected, setSelected] = useState(0);
  const current = images[Math.min(selected, images.length - 1)];

  if (!current) return <ProductImage src={null} alt={productName} className="rounded-3xl" />;

  return (
    <div className="space-y-4">
      <ProductImage src={current.url} alt={current.alt} className="rounded-3xl" sizes="(min-width: 768px) 50vw, 100vw" />
      {images.length > 1 && (
        <ul className="grid grid-cols-4 gap-3" aria-label={`Fotos de ${productName}`}>
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-label={`Ver foto ${index + 1} de ${images.length}`}
                aria-pressed={index === selected}
                className={cn(
                  "block w-full rounded-xl border-2 transition",
                  index === selected ? "border-navy" : "border-transparent opacity-80 hover:opacity-100",
                )}
              >
                <ProductImage src={image.url} alt="" className="rounded-[10px]" sizes="12vw" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
