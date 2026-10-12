# Catálogo con filtros y productos digitales (PDF)

## 1. Qué cambió

**Catálogo.** `/shop?categoria=<slug>&coleccion=<slug>`; las opciones muestran cuántos productos ACTIVOS hay *dado el otro filtro elegido*, las opciones sin productos no se ofrecen (la elegida siempre se ve) y "Limpiar filtros" vuelve a `/shop`. Los filtros son enlaces: funcionan sin JavaScript y se pueden compartir. Slugs inválidos se ignoran. Cada colección activa tiene página propia (`/shop/colecciones/<slug>`). Un producto tiene **una categoría y varias colecciones** (tabla `product_collections`; `products.collection_id` queda como columna heredada sincronizada con la primera colección).

**Tipo de producto.** `products.product_type` = `PHYSICAL` | `DIGITAL`, elegido a mano en el panel (no se deduce de la categoría: puede haber libros impresos y libros digitales). Un digital: sin inventario, sin variantes, cantidad máxima 1, nace como borrador y no se puede publicar ni comprar sin un PDF activo. El tipo no se puede cambiar cuando el producto ya tiene pedidos.

**Checkout.**
- Solo físico: igual que antes.
- Solo digital: envío ₡0 (`orders.requires_shipping=false`, snapshot con `shipping.required=false`), sin dirección de entrega. Tilopay exige una dirección, así que se pide una **dirección de facturación** (el cuerpo enviado a Tilopay no cambió).
- Mixto: el envío (tarifa y umbral de envío gratis) se calcula solo con el subtotal de lo físico.
- Total, IVA y monto enviado a Tilopay salen del mismo cálculo del servidor (comprobado en las pruebas).

**Entrega digital.**
- PDF en un almacén Vercel Blob **privado** y separado (`DIGITAL_BLOB_READ_WRITE_TOKEN`); nunca hay URL pública. Se sube desde el panel directo al almacén y luego el servidor lo relee, verifica que sea PDF, calcula tamaño y SHA-256 y lo vincula.
- Se descarga por `/api/downloads/<token>` (el servidor lo transmite; la URL del almacén nunca sale). **Cada petición vuelve a verificar** pedido en estado pagado + pago `PAID` registrado por la conciliación con Tilopay + archivo activo + enlace vigente/no revocado/con descargas disponibles. Llegar a la página de éxito no habilita nada.
- Enlaces: token aleatorio de 256 bits (solo se guarda su hash). Correo: 72 h y 10 descargas. Desde la página del pedido: 15 min y 5 descargas, con tope diario. Recuperación: 24 h y 5 descargas.
- Correo de entrega: se reclama una sola vez por pedido (`order_notifications`), así que reintentos de confirmación, recargas o el cron no lo duplican. Si Resend no está configurado no se envía; la página del pedido sigue ofreciendo la descarga.
- Recuperación sin cuenta: `/recuperar-compra` (correo + número de pedido). Respuesta idéntica exista o no el pedido; el correo va siempre al correo del pedido; máximo 3 por pedido por día y límites por IP/correo.
- Si el almacén falla durante una descarga: 503 y el cupo de descargas se devuelve.
- Un pedido digital sin pagar vence a los 30 min como los físicos, verificando antes con Tilopay (si sí cobró, se confirma y se entrega).

## 2. Migración

`drizzle/0013_digital_products_catalog.sql` (**no aplicada a tu Neon**). Crea el enum `product_type`, `product_collections`, `digital_assets`, `digital_download_links`, y columnas con valores por defecto seguros (`products.product_type='PHYSICAL'`, `order_items.fulfillment_type='PHYSICAL'`, `orders.requires_shipping=true`); copia las colecciones existentes a `product_collections` (idempotente). Es aditiva: los pedidos y productos existentes quedan igual.

Orden sugerido: aplicar la migración → configurar `DIGITAL_BLOB_READ_WRITE_TOKEN` → desplegar el código.

## 2b. Configurar el almacén privado de los PDF (paso a paso)

**Proveedor y API.** Vercel Blob (paquete `@vercel/blob`), siempre con `access: "private"`. Los archivos quedan en `https://<id-del-almacén>.private.blob.vercel-storage.com/…`, una dirección que **no se puede abrir sin credenciales**; la tienda los lee en el servidor y los entrega por `/api/downloads/…` solo con el pago confirmado. Un almacén privado se tiene que **crear como privado**: uno público (el de las imágenes de productos) no sirve y el código nunca usa su token.

**1. Crear el almacén privado** (una sola vez; Vercel → tu proyecto):
1. Pestaña **Storage** → **Create Storage** → **Blob** → **Continue**.
2. En *Access* elegí **Private**. Nombre sugerido: `azul-clarito-pdf`.
3. Conectalo al proyecto y marcá los entornos que lo van a usar (**Production** y **Preview**; **Development** solo si querés usarlo desde tu computadora).

Alternativa por consola: `vercel blob create-store azul-clarito-pdf --access private`.

**2. Dónde está el token.** Al conectar el almacén, Vercel agrega al proyecto una variable de lectura/escritura (`BLOB_READ_WRITE_TOKEN`). **Ese nombre ya lo usa el almacén público de imágenes**, así que no dejes que lo sobrescriba (si pasara, la subida de imágenes dejaría de funcionar):
- Si al conectar el panel te deja ponerle un prefijo/nombre distinto a las variables, usá uno que resulte en `DIGITAL_BLOB_READ_WRITE_TOKEN`.
- Si no, copiá el token del almacén nuevo (Storage → el almacén → sección de variables/`.env.local`) y creá a mano la variable `DIGITAL_BLOB_READ_WRITE_TOKEN` en **Settings → Environment Variables**, marcándola como *Sensitive*; y verificá que `BLOB_READ_WRITE_TOKEN` siga apuntando al almacén **de imágenes**.

> Los nombres exactos de los botones del panel de Vercel pueden cambiar; la ruta general (Storage → Blob → acceso Private → conectar al proyecto) está en la documentación oficial: <https://vercel.com/docs/vercel-blob/private-storage>. El código ya está preparado: pasa siempre el token de forma explícita, así que las variables de OIDC que Vercel agrega por el almacén de imágenes no interfieren.

**3. Variable en Vercel** (Settings → Environment Variables): nombre `DIGITAL_BLOB_READ_WRITE_TOKEN`, valor = token del almacén privado, entornos Production y Preview (y Development si corresponde). Después **hacé un redeploy**: las variables nuevas solo aplican a despliegues nuevos.

**4. Variable en tu computadora** (`.env.local`, que está en `.gitignore`):
```
DIGITAL_BLOB_READ_WRITE_TOKEN=<pegá el token acá>
```
Reiniciá `npm run dev`. Con `vercel env pull .env.local` también se puede traer (ojo: reescribe el archivo). **No pegues el token en chats, commits, capturas ni documentación.** Recomendación: usar un almacén privado distinto para Development/Preview, para no mezclar PDF de prueba con los reales.

**5. Verificar.** En el panel: Productos → un producto **Digital** → *Archivo digital (PDF)* → **Probar almacenamiento**. Escribe, comprueba que el almacén sea privado, lee de vuelta y borra un PDF diminuto; muestra ✓/✗ por paso. Luego subí un PDF real, publicá el producto y hacé una compra de prueba en sandbox.

**Mensajes del panel (errores claros).**

| Qué ves | Causa / qué hacer |
|---|---|
| "Falta configurar el almacenamiento privado…" | La variable no existe en ese entorno: agregala y reiniciá/redeployá. Mientras falte, los libros digitales **no se pueden comprar** ni subir. |
| "El almacén rechazó el token (acceso denegado)…" | Token incorrecto, vencido o de otro almacén. |
| "…parece ser un almacén PÚBLICO…" / "Este almacén es PÚBLICO" | Se usó el token del almacén de imágenes. Creá uno **Private**. |
| "El almacén … no existe" / "suspendido" | Almacén borrado o cuenta con problemas en Vercel. |
| "El archivo no es un PDF válido" | Se valida el contenido (firma `%PDF-`), no el nombre. No se vincula. |
| "El PDF debe pesar hasta 50 MB" / "Solo se aceptan archivos PDF" | Validación en el navegador antes de subir. |
| "No se pudo subir el archivo… usá «Probar almacenamiento»" | Fallo de red o del almacén: la prueba dice cuál. |

**Reglas que se mantienen:** el PDF nunca tiene URL pública; solo se entrega con pago confirmado por el servidor; un digital sin PDF válido (o sin almacén configurado) no se puede publicar ni comprar.

## 3. Supuestos sin confirmar (verificar antes de vender)

1. **Acceso privado de Vercel Blob.** Confirmado en la documentación oficial (almacenamiento privado, disponible con `@vercel/blob` ≥ 2.3; requiere un almacén creado como *Private*). Lo que **no** se probó es el comportamiento contra un almacén real: solo contra un simulador.
2. **Subida directa desde el navegador** (`handleUpload`, hasta 50 MB) no se pudo probar contra Vercel real; en las pruebas el navegador habló con un simulador.
3. Plan Hobby: la descarga pasa por una función con `maxDuration=60`; para PDF grandes sobre conexiones lentas puede ser el límite.

## 4. Decisiones que necesitan tu aprobación

- Dirección de facturación obligatoria en pedidos solo digitales (la exige Tilopay).
- Envío gratis y tarifas calculados sobre el subtotal **físico**.
- Cantidad máxima 1 por libro digital.
- Tipo de producto bloqueado una vez que tiene pedidos.
- Un pedido reactivado a mano por el equipo tras un pago tardío no entrega el PDF automáticamente; la clienta lo recupera con "Recuperar mi compra".
- La página "Mis pedidos" de la cuenta sigue siendo un marcador ("próximamente"); no se construyó. La recuperación va por la página del pedido y por correo.
- `products.collection_id` se mantiene (heredada) para no romper nada; se puede retirar en una migración posterior.

## 5. Pruebas

- Unitarias (Vitest): 390 pasan (incluye las de totales físico/digital/mixto, envío, impuestos, nombres de archivo, filtros y mensajes de error del almacén).
- E2E con **simuladores** (Neon emulado, Resend, Blob y Tilopay falsos; **no** es el sandbox real de Tilopay): `run8.mjs` (115 comprobaciones; más `run9.mjs` para "sin token" y "token incorrecto") cubre carritos solo digital / solo físico / mixto, envío, pago pendiente, rechazado y confirmado, descarga autorizada (PDF idéntico byte a byte), reintentos sin duplicar el correo, vencimiento/límite/revocación de enlaces, recuperación, vencimiento de pedidos digitales, filtros y conteos, filtros como listas desplegables (también sin JavaScript y en móvil), formulario y subida de admin, «Probar almacenamiento», PDF inválido/grande/fallo de subida y la cadena completa subir → comprar → pagar → descargar. Regresión de las suites anteriores sin cambios.
- Pendiente con credenciales reales: una compra digital completa en el sandbox de Tilopay y una subida real al almacén privado de Vercel.
