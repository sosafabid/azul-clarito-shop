# Medición comercial de Azul Clarito Shop

Guía de **activación, pruebas y límites** de GA4, Meta Pixel, consentimiento de cookies, SEO de producto y reportes.
Código principal: `src/domain/analytics.ts`, `src/lib/analytics/*`, `src/components/analytics/*`, `src/domain/commerce-metrics.ts`.

## 1. Estado de fábrica (sin configurar nada)

- **No existía GA4 ni Meta Pixel en el repositorio.** Se creó una instalación limpia, única, controlada por variables de entorno.
- Sin ID, **no se carga ningún script de terceros**. El banner de cookies y la página de preferencias funcionan igual.
- Ningún ID, token ni credencial fue inventado. Los IDs de medición son públicos (viajan en el navegador); no son secretos.

## 2. Activar en Vercel (en este orden)

1. En GA4: Administrar → Flujos de datos → tu flujo web → copia el **ID de medición** (`G-XXXXXXXXXX`).
2. Vercel → proyecto → Settings → Environment Variables → agrega (Production, y Preview si quieres probar):
   - `NEXT_PUBLIC_GA_MEASUREMENT_ID` = `G-XXXXXXXXXX`
   - `NEXT_PUBLIC_META_PIXEL_ID` = ID numérico del Pixel (solo si vas a usar Meta)
   - `NEXT_PUBLIC_META_PURCHASE_ENABLED` = `true` **solo después** de verificar el Pixel (sección 7)
3. **Redeploy**: las variables `NEXT_PUBLIC_*` se incorporan al compilar; un cambio de valor requiere un deploy nuevo.
4. Configuración recomendada en GA4 (manual, no se puede hacer desde el código):
   - Flujo de datos → *Configurar ajustes de etiqueta* → **Ocultar datos → Parámetros de consulta de URL**: `t, provincia, ciudad, cp, pais, entrega` (refuerzo: el sitio ya envía la URL sin parámetros).
   - Administrar → Configuración de datos → **Filtros de datos**: crea un filtro de *tráfico interno* para tu IP y marca la compra de prueba real ya hecha para excluirla de los informes.
   - Eventos → marca `purchase` como **evento clave**.
   - Retención de datos de eventos: 14 meses (Administrar → Configuración de datos → Retención).
5. Pruebas (sección 6) antes de dar por buena la medición.

> Preview/pruebas: usa un flujo/propiedad de GA4 **aparte** para pruebas, con su propio ID solo en el entorno Preview. No mezcles pruebas con la propiedad real.

## 3. Eventos de GA4 implementados

`currency` siempre es la moneda real del producto/pedido (CRC), con montos reales sin conversión (`src/domain/money.ts` → cifra humana: ₡12.000 = `12000`).
`item_id` = **SKU del producto** (no de la variante; la variante va en `item_variant`), igual en todo el embudo.
`value` = **subtotal de productos** (sin envío ni impuestos). Envío e impuesto se envían aparte en `purchase`.

| Evento | Dónde y cuándo | Parámetros |
|---|---|---|
| `page_view` | Cada cambio de ruta (el automático de GA4 está apagado: `send_page_view:false`, así no hay duplicados) | `page_path`, `page_title`, `page_location` (sin parámetros) |
| `view_item_list` | Tienda y colecciones, una vez por visita/filtro | `item_list_id`, `item_list_name`, `currency`, `items[]` (hasta 100) |
| `select_item` | Clic en una tarjeta de producto del catálogo | `item_list_id`, `item_list_name`, `currency`, `items[1]` |
| `view_item` | Ficha de producto | `currency`, `value`, `items[1]` |
| `add_to_cart` | Cuando el **servidor confirma** que se agregó (ficha y botón de la tarjeta) | `currency`, `value`, `items[1]` con cantidad y `item_variant` |
| `view_cart` | Página del carrito (solo líneas sin problemas) | `currency`, `value`, `items[]` |
| `begin_checkout` | Entrada al checkout sin bloqueos; **1 vez por sesión y contenido de carrito** | `currency`, `value`, `items[]` |
| `add_shipping_info` | Cuando el envío quedó resuelto (con costo) o se eligió retiro; **1 vez por sesión, carrito y método** | `currency`, `value`, `shipping_tier`, `items[]` |
| `purchase` | Página de resultado, **solo con pago confirmado** (sección 4) | `transaction_id`, `currency`, `value`, `tax`, `shipping`, `items[]` |

`items[]` incluye `item_id`, `item_name`, `price`, `quantity`, y cuando hay: `item_category`, `item_variant`, `item_list_name`, `index`.

## 4. `purchase`: confirmación y deduplicación

**Confirmación (solo backend):** la página `/checkout/result` lee el pedido de la base de datos. Su estado y `paid_at` solo cambian cuando el servidor **verifica el pago con Tilopay** (`confirmPayment`). La compra se mide únicamente si:
1. el estado es "pagado" (no pendiente, no fallido, no cancelado ni reembolsado),
2. existe `paid_at` (lo escribe esa verificación),
3. el pago ocurrió hace **menos de 24 h** (volver al enlace del pedido días después no cuenta de nuevo),
4. la persona aceptó cookies de medición.

Los datos (`transaction_id` = número de pedido, `value`, `tax`, `shipping`, `items`) salen **del pedido guardado**, nunca de la URL. No se envían nombre, correo, teléfono, dirección ni datos de pago.

**Sin duplicados (tres capas, sin migración de base de datos):**
1. El evento solo existe en el HTML cuando el pedido está pagado y es reciente.
2. El navegador "reserva" `ac_purchase_<pedido>` en `localStorage` **antes** de enviar (refrescar, volver o abrir dos pestañas no reenvía).
3. GA4 descarta compras repetidas con el mismo `transaction_id`.

**Por qué no hay migración:** el pedido ya tiene `paid_at` y un número único; juntos dan la ventana de seguridad. Una columna "ya medido" solo ayudaría a no repetir si la persona cambia de navegador dentro de las 24 h, y GA4 ya cubre ese caso con `transaction_id`. No se agregó ninguna columna.

**Limitación honesta:** `purchase` se mide **en el navegador**, al volver a la tienda tras pagar. Si alguien paga y cierra la pestaña de Tilopay sin volver, esa compra no se mide en GA4 (sí queda en la base de datos y en los reportes del panel). La medición desde servidor (Measurement Protocol) requiere un *API secret* de GA4 y guardar el `client_id` en el pedido (migración); queda como mejora futura. **Las ventas oficiales son siempre las de la base de datos.**

## 5. Consentimiento y privacidad

- Banner con **Aceptar todas / Solo necesarias / Personalizar** (peso visual igual para aceptar y rechazar). Todo lo opcional empieza **apagado**.
- Cookie propia `ac_consent` (180 días, `SameSite=Lax`, `Secure` en https): `v1.<medición><publicidad>.<fecha>`. Vencida o de otra versión = se vuelve a preguntar.
- Se puede cambiar en cualquier momento: pie de página y política de privacidad → **Preferencias de cookies**. Retirar el permiso apaga la herramienta y borra sus cookies (`_ga*`, `_fbp`, `_fbc`).
- GA4: sin señales de Google ni personalización de anuncios (`allow_google_signals:false`, `allow_ad_personalization_signals:false`); Consent Mode con `ad_*` en *denied*. `page_location` viaja **sin parámetros** (nunca el enlace privado `?t=` del pedido ni la provincia/ciudad/código postal del checkout).
- Meta: cada llamada se hace con la barra de direcciones limpia por ~1,5 s, porque el Pixel lee la URL completa. El Pixel **no se mide** en cuentas, restablecimiento de contraseña ni recuperación de compra.
- El panel `/admin` **no se mide**.
- La política `/privacidad` se actualizó (sección 10 y versión `2026-11-27`). **Requiere revisión de una persona abogada** (ver sección 9): no se afirma cumplimiento legal.
- La tienda (carrito, checkout, pago) funciona igual con cookies opcionales rechazadas.

## 6. Cómo probar (sin compras falsas en producción)

**Preparación:** usa el entorno Preview con un flujo de GA4 de pruebas (ID propio) o el real con tu IP excluida. Abre la tienda, acepta las cookies de medición.

**GA4 DebugView:** con la extensión *Google Analytics Debugger* activa (o con Tag Assistant conectado), Administrar → DebugView muestra tu dispositivo y los eventos en tiempo real.
**Tag Assistant (tagassistant.google.com):** conecta con la URL de la tienda; debe verse **una** etiqueta GA4 y los eventos entrando.
**Realtime:** Informes → Tiempo real → los eventos aparecen en ~30 s.

Recorrido y qué debe verse:
1. Abrir un producto → `page_view`, `view_item`.
2. Agregar al carrito → `add_to_cart` (cantidad y variante correctas).
3. Ver el carrito → `view_cart`.
4. Iniciar checkout → `begin_checkout`.
5. Elegir envío / retiro → `add_shipping_info`.
6. Pagar → Tilopay (sin eventos allí).
7. Volver a la tienda con el pago confirmado → `purchase` **una vez**, con el número de pedido real como `transaction_id`, `currency = CRC`, `value` = subtotal de productos, `tax`, `shipping`, `items`.
8. Refrescar `/checkout/result` → no aparece otro `purchase`.

**Cookies:** antes de aceptar, en Herramientas de desarrollo → Red, no debe haber peticiones a `googletagmanager.com` ni `connect.facebook.net`. Tras "Solo necesarias" tampoco.
**Compras de prueba:** no uses pedidos falsos en la propiedad real. Para validar `purchase` de punta a punta hace falta un pago real o el modo sandbox de Tilopay en Preview con la propiedad de pruebas.

## 7. Meta Pixel

- **Estado:** no estaba configurado; se implementó (apagado hasta que pongas `NEXT_PUBLIC_META_PIXEL_ID` y la persona acepte "Publicidad").
- Eventos: `PageView`, `ViewContent` (ficha), `AddToCart`, `InitiateCheckout`, `Purchase` (valor = subtotal de productos, `eventID` = `purchase.<pedido>`).
- **Purchase está apagado por defecto** (`NEXT_PUBLIC_META_PURCHASE_ENABLED`). Antes de activarlo: en Meta → Administrador de eventos → **Probar eventos**, haz una compra y comprueba que la URL (`dl`) del evento **no** trae `?t=…`. Si la trae, no lo actives y avísame.
- **API de Conversiones: no implementada** (pedido expreso). Los `eventID` ya quedan listos para deduplicar el día que se sume.

## 8. Reportes comerciales

- Pantalla `/admin/reportes` (solo SUPER_ADMIN, solo lectura): pedidos pagados, ingresos, ticket promedio, unidades, rendimiento por producto, por país y estado del catálogo. Periodos 7/30/90/365 días.
- **Fuentes separadas:** ventas = base de datos (pedidos con pago verificado); tráfico y comportamiento = GA4; catálogo = productos activos e inventario. Definiciones en `src/domain/commerce-metrics.ts` y en la propia pantalla.
- **No hay datos inventados** ni históricos sembrados: sin pedidos, todo en cero.
- **Punto de integración futuro:** `funnelRates()` ya calcula tasa de carrito, de checkout y conversión cuando se le entreguen cifras de GA4 (por la API de datos de GA4, que requiere una cuenta de servicio: pendiente).

## 9. Requiere revisión legal / de negocio

- Texto del aviso de cookies y sección 10 de la política (versión `2026-11-27`), y que `legalConfig.reviewed` siga en `false` hasta que una persona abogada apruebe los textos (Ley 8968 / PRODHAB).
- Datos del responsable del tratamiento (`legalConfig.controller`) siguen vacíos.
- Transferencia de datos a Google y Meta fuera de Costa Rica.

## 10. Preparación para Google Merchant Center (fichas gratuitas)

No se activó ni se afirma ninguna cuenta ni aprobación. El catálogo ya expone datos reales por ficha de producto (JSON-LD `Product` con SKU, fotos, precio en CRC, disponibilidad, marca "Azul Clarito"). Mapeo para un futuro feed:

| Merchant | Fuente |
|---|---|
| `id` | SKU del producto |
| `title` / `description` | nombre / descripción corta o larga |
| `link` | `/shop/<slug>` |
| `image_link` | foto principal del producto |
| `availability` | `in_stock` / `out_of_stock` (estado público) |
| `price` | precio + `CRC` (p. ej. `12000 CRC`) |
| `brand` | Azul Clarito |
| `condition` | `new` |

Pendientes manuales en Merchant Center: verificar y reclamar el dominio, políticas de envío y devolución, y marcar `identifier_exists = no` (no hay GTIN/MPN en el catálogo). Las variantes (tallas) necesitan un `item_group_id` en el feed.

## 11. No soportado (y por qué)

- **`add_payment_info`**: el pago ocurre en la página alojada de Tilopay; la tienda no sabe cuándo la persona ingresa la tarjeta. Dispararlo al pulsar "Pagar" contaría también intentos que fallan la validación. No se fabrica.
- `add_to_cart` **no se mide** cuando el servidor agregó menos de lo pedido por stock/tope (no se conoce la cantidad exacta agregada). Cambios de cantidad y `remove_from_cart` en el carrito no se miden.
- `item_category` solo en lista, ficha, carrito y compra de productos con categoría; en carrito/checkout no se envía (el carrito no la trae).
- Compras de quien no vuelve a la tienda tras pagar (ver sección 4).
- Personas que rechazan cookies no aparecen en GA4/Meta (sí en la base de datos).

## 12. Rollback

Sin migraciones ni cambios de datos. Para apagar todo: borra `NEXT_PUBLIC_GA_MEASUREMENT_ID` y `NEXT_PUBLIC_META_PIXEL_ID` en Vercel y redeploy (el banner seguirá funcionando; no cargará nada). Para quitar el código: `AnalyticsProvider` en `src/app/(store)/layout.tsx` y los `Track*` en las páginas.
