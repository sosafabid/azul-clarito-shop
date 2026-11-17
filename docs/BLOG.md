# Diario Azul (blog) — cómo publicar un artículo

## Regla permanente: portada obligatoria

**Ningún artículo se publica sin imagen de portada.** Cada artículo declara su portada en el campo `image`:

```ts
image: {
  src: "/blog/mi-articulo.webp",          // archivo dentro de /public/blog
  alt: "Descripción real de lo que se ve", // mínimo 25 caracteres, descriptivo (accesibilidad y SEO)
  width: 1600, height: 900,               // tamaño real en píxeles
  position: "50% 40%",                    // opcional: encuadre del recorte (CSS object-position)
},
```

- La **misma** imagen se usa en la tarjeta del listado, en la cabecera del artículo y al compartir en redes.
- Siempre se muestra en **16:9** con `object-fit: cover` (se recorta, nunca se deforma). Por eso la foto debe ser horizontal (mínimo 3:2) y de al menos 800 px de ancho; lo ideal es 1600×900.
- Preferir **fotos propias de Azul Clarito** (productos reales, Limón, el Caribe). Nada de fotos genéricas de stock ni imágenes que no correspondan al tema. El texto alternativo debe describir lo que realmente se ve.
- No hay degradados ni fondos de color de reemplazo: si falta la portada, el artículo no se publica.

## Pasos para publicar

1. Poner la foto en `public/blog/` (de preferencia en `.webp`).
2. Crear el archivo del artículo en `src/content/blog/` (copiar uno existente).
3. Agregarlo a la lista `REGISTERED` en `src/content/blog/index.ts`.
4. Correr `npm run blog:check`. Si falta algo, muestra qué falta, en español.
5. `npm run build` ejecuta esa misma validación y **se detiene** si algún artículo incumple la regla, así que no se puede desplegar un artículo sin portada por descuido.

Como segunda barrera, aunque algo se saltara la validación, un artículo inválido **no aparece** en el sitio (ni tarjeta, ni página, ni sitemap).
