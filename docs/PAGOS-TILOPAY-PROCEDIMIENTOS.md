# Pagos con Tilopay — procedimientos manuales

Estado: **solo sandbox, producción deshabilitada**. Este documento corresponde al código del ZIP `azul-clarito-shop-pagos-tilopay.zip` (ver huella al final de la entrega). Nada de esto se ejecutó contra tu Neon ni contra Tilopay real.
Todo lo que dice "simulador" se probó contra un servidor falso que escribí yo a partir de la documentación; **no es evidencia de que Tilopay se comporte así**.

---

## 0. Credenciales sandbox: configuración segura y primera prueba

### 0.1 Compatibilidad con la documentación (verificada el 2026-10-10, antes de cualquier llamada)
Fuentes: tilopay.com/developers (entornos, autenticación, registro, tarjetas de prueba, reintentos seguros, respuestas de error).

| Tema | Lo que dice la documentación | Consecuencia |
|---|---|---|
| Origen de `apiuser`, `password`, `key` | "se obtienen en el panel del comercio" | Coherente con que las hayas encontrado en el panel comercial |
| Credenciales de **sandbox** | La página de registro dice que cada developer se registra y recibe las suyas ("No hay credenciales de sandbox compartidas"). **No menciona** "Conexión a plataformas → Credenciales de conexión → API General" | **Que las credenciales del panel comercial en modo pruebas sirvan para esta API NO está confirmado por escrito.** La prueba definitiva es el login (`npm run tilopay:check -- --login`): no crea pagos |
| Host | Pruebas y producción usan **el mismo** host `app.tilopay.com`; "No existe un host de sandbox" | La URL no indica el modo |
| Cambio de modo | "El modo se alterna desde la cuenta en el portal de Tilopay" | El modo lo decide el panel, no el código |
| ¿Credenciales distintas por modo? | **No lo dice** | Debemos asumir que **las mismas credenciales podrían cobrar de verdad si el panel pasa a producción** |
| Señal oficial del modo | Campo `test` de `Tilopay.Init()` (SDK): `1` pruebas, `0` producción. La página advierte que con el mismo host "alguien puede creer que está en pruebas y estar cobrando dinero real" | No aplica al flujo HPP. La tienda usa `environment` de `consult` ("Test" en los ejemplos); esa equivalencia **no está documentada** (A3) |
| Login | `POST /api/v1/login` con `apiuser` y `password`; responde `access_token`, `token_type` ("bearer"), `expires_in`; token del API: 24 h; usar `Authorization: bearer <token>` | Coincide con el cliente (A16 ✔). Envío `Bearer` con mayúscula: el esquema HTTP no distingue mayúsculas, pero lo confirmamos en S0 |
| `key` | No dice si es secreta | La tratamos como secreta (solo servidor) |
| Límites de uso | No documentados | — |
| Tarjetas de prueba | 27 tarjetas; cualquier vencimiento futuro y cualquier CVV; el challenge 3DS usa el código `3ds2`; **la tarjeta decide el resultado, no el monto**; solo funcionan en modo pruebas | Ver 0.5 |
| `orderNumber` | Único por comercio **para siempre**; repetirlo da "Transacción duplicada"; el API **no es idempotente**; ante un timeout: consultar primero y, si no existe, se puede reusar el mismo número | La tienda consulta antes de reintentar ✔. Largo máximo/caracteres: no documentado (A8) |
| Errores | No hay estándar: pueden venir con HTTP 200; hay cuatro formatos de error según el endpoint; rechazo del emisor = `code` + `description`. **No documenta** qué devuelve `consult` si la orden no existe | A7 sigue sin confirmar |

**Actualización de supuestos:** A15 (host único) y A16 (campos del login) quedan **documentados**. El resto de la lista de la sección 3 sigue **sin confirmar**.

### 0.2 Riesgo principal y cómo lo cubrimos
Si el panel de Tilopay se pone en **producción** mientras la tienda está en `TILOPAY_MODE=sandbox`, la tienda **no puede impedir** que Tilopay cobre una tarjeta real (el cobro ocurre en la página de Tilopay). Lo que sí hace: al verificar, **no confirma** ninguna transacción cuyo ambiente no sea "Test" y marca el pedido para revisión. Por eso:
1. Antes de cada sesión de pruebas, mirá que el panel siga en modo pruebas.
2. Usá **solo** las tarjetas de prueba oficiales. Nunca una tarjeta real.
3. No cambies el panel a producción hasta que yo y vos cerremos la compuerta de la sección 3.

Protecciones del código (revisadas hoy): `TILOPAY_MODE` por defecto es `sandbox`; un valor desconocido apaga los pagos; `production` exige además `TILOPAY_CONFIRM_PRODUCTION=SI_COBRAR_DE_VERDAD` (no la definas); en sandbox solo se confirman transacciones "Test"; los montos, la moneda y el número de pedido se comparan con lo guardado; el navegador nunca confirma un pago. La arquitectura impide además leer las credenciales fuera de `config.ts` y exponerlas en el frontend (hay una prueba automática).

### 0.3 Dónde poner cada variable (sin pegarlas en el chat)
Variables y sus valores **solo en tu computadora y en el panel de Vercel**; nunca en Git, chat, capturas ni correos.

| Variable | Valor | Local (`.env.local`) | Vercel Preview |
|---|---|---|---|
| `TILOPAY_API_USER` | tu apiuser | sí | sí |
| `TILOPAY_API_PASSWORD` | tu password de API | sí | sí (tipo **Secret**) |
| `TILOPAY_API_KEY` | tu key | sí | sí (tipo **Secret**) |
| `TILOPAY_MODE` | `sandbox` | sí | sí |
| `TILOPAY_CONFIRM_PRODUCTION` | **no definir** | no | no |
| `CRON_SECRET` | texto aleatorio largo (`openssl rand -hex 32`) | sí | sí (tipo **Secret**) |
| `DATABASE_URL` | cadena de una **rama de pruebas** de Neon (ver 0.4) | sí | la misma rama de pruebas |
| `DATABASE_URL_UNPOOLED` | conexión directa de esa misma rama (para migrar) | sí | opcional |
| `NEXT_PUBLIC_SITE_URL` | local: `http://localhost:3000` | sí | ver "Preview" abajo |

**Local**
1. Abrí `.env.local` (raíz del proyecto) con tu editor y escribí cada variable como `NOMBRE=valor`, sin comillas ni espacios. No uses `echo` en la terminal (queda en el historial) ni `cat` para revisarlo.
2. En macOS/Linux: `chmod 600 .env.local`.
3. `.env.local` ya está ignorado por Git. Reforcé el `.gitignore` para ignorar también `.env`, `.env.production`, `.env.*.local`…, dejando solo `.env.example` (con placeholders vacíos) en el repositorio.
4. Comprobá sin imprimir secretos: `npm run tilopay:check` (solo muestra "definida / NO definida" y el modo; sin red).
5. Prueba de credenciales (UNA llamada de inicio de sesión, no crea pagos): `npm run tilopay:check -- --login`. Muestra solo OK/FALLÓ. **Corrélo cuando me des la autorización o hacelo vos.** Aún no hice ninguna llamada a Tilopay.

**Vercel (Preview)** — según la documentación de Vercel: *Project → Settings → Environment Variables → Add*; en "Environments" marcá **solo Preview** (desmarcá Production y Development) y elegí el tipo **Secret** para password, key y `CRON_SECRET` (los Secret son de solo escritura después de guardar). Los cambios solo aplican a **nuevos** despliegues. No crees ninguna de estas variables en Production.

**⚠ Preview y el retorno de Tilopay.** Los enlaces y el retorno de la tienda usan `NEXT_PUBLIC_SITE_URL`; **en Vercel (incluidos los Preview) cualquier dominio `*.vercel.app` se ignora y se usa `https://shop.azulclaritocr.com`**. Resultado: en un Preview, el navegador volvería a la tienda de producción (que no debería tener estas variables de pruebas). Opciones: (a) **probar primero en local** (recomendado: el retorno es una redirección del navegador y funciona con `http://localhost:3000` si Tilopay la acepta — pregunta 13); (b) para Preview, asignar un subdominio propio (por ejemplo `pruebas.azulclaritocr.com`) a la rama de pruebas y ponerlo en `NEXT_PUBLIC_SITE_URL` (Preview). Además, los Preview están protegidos por Vercel Authentication por defecto: abrilos con tu sesión de Vercel iniciada. Crear la rama y publicar un Preview requiere subir código a Git, **que no haré sin tu autorización**.

### 0.4 Base de datos para las pruebas (no uses producción)
Las pruebas crean pedidos, pagos y reservas. Hacelo en una **rama de pruebas de Neon**, no en la base de producción:
1. Creá una rama de Neon (mismos pasos de 1.2, parent = producción, **Current data**), nombre `pruebas-pagos`. Puede ser distinta de la de respaldo.
2. Poné la cadena de **esa rama** en `DATABASE_URL` y `DATABASE_URL_UNPOOLED` de tu `.env.local`.
3. Ensayá allí el procedimiento de la sección 1 (consultas de lectura, luego `npm run db:migrate`). Es el **ensayo general** de la migración real y no toca producción.
4. Los productos de prueba se crean en esa rama, no en el catálogo público real.

### 0.5 Primer caso manual de sandbox (el más simple): pago aprobado sin fricción
Preparación: ítems 0.3 y 0.4 hechos; el panel de Tilopay en modo pruebas; `npm run tilopay:check -- --login` en OK; `npm run dev`; un producto activo con stock en la rama de pruebas; una tarifa de envío para Limón.

1. En `http://localhost:3000` agregá 1 unidad al carrito → Checkout. Provincia Limón, cantón Limón, código postal `70101`; completá nombre, correo, teléfono y dirección; aceptá términos → **Pagar con tarjeta**.
2. Tilopay te lleva a su página de pago (la tienda no pide tarjeta). Anotá la fecha y hora.
3. Pagá con la Visa de prueba **4111 1111 1111 1111**, vencimiento futuro cualquiera, CVV cualquiera.
4. Tilopay te devuelve a la tienda → `/checkout/result`.

Cómo comprobar el resultado (todo debe cumplirse):
- La página dice que Tilopay **confirmó** el pago (no "todavía no recibimos la confirmación").
- En el panel `/admin/orders` (como SUPER_ADMIN): el pedido figura **Pagado**, con el id de transacción; el detalle muestra el evento "Pago confirmado por Tilopay (verificado)" y la reserva en estado COMMITTED.
- Stock del producto: una unidad menos disponible y una vendida.
- Sin alerta "Requiere revisión". (Si aparece una de "monto/moneda/entorno", **no sigas**: pasame solo el texto de la alerta.)
- En el portal de Tilopay la transacción aparece en modo pruebas.
- Para mi análisis, anotá (sin credenciales) de la transacción: `code`, `type`, `environment`, `amount`, `currency`. Eso valida A1, A3 y A6.

Si el retorno falla por el dominio `localhost`, el pedido igual se resuelve: en el panel, **Verificar con Tilopay** (o `npm run payments:reconcile`) lo confirma. Si Tilopay rechaza el `redirect`, dímelo: es la pregunta 13.

Siguientes casos (en orden): S2 rechazada `4111111111110000`, S3 reintento aprobado, S4 con challenge 3DS (`4012000000020071`, código `3ds2`), S5 pagar y cerrar la pestaña, S6 abandonar sin pagar.

---

## 1. Migraciones 0004–0012 en tu Neon

**No pude verificar qué hay aplicado en tu Neon**: en mi entorno no tengo tu `DATABASE_URL` (el archivo `.env.local` de mi copia la tiene vacía). Lo confirmás vos con las consultas de abajo (todas de solo lectura).

### 1.1 Cómo decide Drizzle qué aplicar
`npm run db:migrate` lee la tabla `drizzle.__drizzle_migrations` y aplica **todas las migraciones del journal cuyo `when` sea mayor que el mayor `created_at` guardado**. Compara solo ese máximo (no revisa una por una). Por eso:
- Si la tabla refleja la realidad, `db:migrate` aplica únicamente las pendientes: es seguro.
- Si alguna migración se aplicó "a mano" (por ejemplo con el SQL editor) sin registrarse, o si hay huecos, el máximo engaña. Hay que detectarlo **antes**.

### 1.2 Paso 0 — rama de respaldo en Neon (obligatorio antes de tocar nada)
Pasos según la documentación de Neon (https://neon.com/docs/manage/branches):
1. En la consola de Neon, elegí tu proyecto y, en el menú lateral, **Branches**.
2. Clic en **New branch**.
3. **Parent branch**: la rama que usa tu tienda en producción (normalmente la predeterminada).
4. Nombre sugerido: `respaldo-pre-pagos-2026-10`.
5. En qué incluir, elegí **Current data**.
6. ⚠️ **Desmarcá "Automatically delete branch after"** (viene marcado por defecto) o ponele un plazo largo: si no, el respaldo se borra solo.
7. **Create**.
(Por CLI: `neon branches create --name respaldo-pre-pagos-2026-10`.)

Notas: la rama de respaldo cuenta contra el límite de ramas y el almacenamiento de tu plan (en el plan Free, 3 ramas raíz por proyecto y 1 GB); borrala cuando termines. Para volver atrás, Neon ofrece "Instant restore" (restaurar una rama al estado de otra o a su historial): seguí esa guía de Neon **antes** de improvisar. Mi tienda no usa la rama de respaldo; su cadena de conexión es distinta de la de producción: no la pongas en `DATABASE_URL`.

### 1.3 Paso 1 — qué dice el registro de Drizzle
En el SQL editor de Neon (o `psql`), sobre la base de producción:

```sql
select id, hash, created_at from drizzle.__drizzle_migrations order by created_at;
```

Compará con esta tabla (el `created_at` debe ser idéntico al `when`; el `hash` es el sha256 del archivo `.sql`):

| Migración | when (= created_at) | hash sha256 |
|---|---|---|
| 0004_tax_and_shipping_rules | 1791344394241 | 8d5d2c0ee5fa0e65c12e5f594ae09747aca0eebad2526e74d8f19917021fa113 |
| 0005_shipping_zone_name_and_packed_status | 1791347012158 | 158ffd7c9b0681363b5e87c8eca9ba5e97d1fb7bfa0fff81ba557c46dc199d65 |
| 0006_default_national_shipping_method | 1791347013262 | ac60ec8f10dd9134a4906487408116f236cedcfd414eb897c8396cc0f421ee97 |
| 0007_orders_shipping_actual_cost | 1791348779323 | 421df769fac0b2a4738f18cc7de56460fad382be385b9b15284f20d30e8534e0 |
| 0008_initial_national_shipping_rate | 1791348780458 | 33688e388cb1a3f88c7079a1ed25c68c36459f1a6390d8bc01f7f70dbec518d3 |
| 0009_auth_tokens_and_throttle | 1791495802532 | 5ada2b184aa3093fff6a8c26d41ebe533ccbce4d4f1a5d922620465e0b2ee9f6 |
| 0010_staff_invitations | 1791497547549 | 43052af075a9d5c5e0e695fa84eee93794c37645ba6f5ca453c303e9842de5fe |
| 0011_protect_last_super_admin | 1791497548696 | 2d2b560ba81908f6fd92ebcb84cf3b5ad89793bd93fa67d237398e53cb32d2b2 |
| 0012_tilopay_payments | 1791501604265 | 74dbd76f2b50d976e6697dbecc8f08627a5461b542f32a7e8bd45df9262dacb3 |

(Las anteriores, 0000–0003, también deben figurar. Si algún `hash` no coincide, el archivo cambió desde que se aplicó: **no sigas**, avisame.)

### 1.4 Paso 2 — verificar que el registro coincide con la estructura real

```sql
select
  to_regclass('public.tax_rates') is not null                                                         as m0004_tax_rates,
  exists (select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='order_status' and e.enumlabel='PACKED') as m0005_packed,
  exists (select 1 from information_schema.columns where table_name='shipping_rates' and column_name='zone_name')            as m0005_zone_name,
  exists (select 1 from shipping_methods where code='envio-nacional')                                 as m0006_0008_envio_nacional,
  exists (select 1 from information_schema.columns where table_name='orders' and column_name='shipping_actual_cost')        as m0007_actual_cost,
  to_regclass('public.auth_tokens') is not null                                                       as m0009_auth_tokens,
  to_regclass('public.staff_invitations') is not null                                                 as m0010_invitations,
  exists (select 1 from pg_trigger where tgname='users_protect_last_super_admin')                     as m0011_trigger,
  to_regclass('public.inventory_reservations') is not null                                            as m0012_reservations;
```

Interpretación (cada migración debe cumplir "registrada ⇔ estructura presente"):

| Situación | Qué hacer |
|---|---|
| Registradas hasta N y la estructura de 0004…N existe y la de N+1… no existe | **Normal.** Seguí al paso 3. |
| La estructura de alguna migración existe pero **no está registrada** (se aplicó a mano) | **No ejecutes `db:migrate`**: intentaría repetirla y fallaría o duplicaría. Avisame con el resultado: preparo un script que registre las ya aplicadas (insertando su fila con el `when` y `hash` de la tabla) y aplique solo las faltantes. |
| Registrada pero la estructura **no existe** | **Detenete.** Algo se restauró o se revirtió; avisame. |
| La tabla `drizzle.__drizzle_migrations` no existe | Igual que la 2ª fila. No ejecutes `db:migrate`. |

### 1.5 Paso 3 — aplicar solo las pendientes
Solo cuando 1.3 y 1.4 estén en la fila "Normal":
1. Poné `DATABASE_URL_UNPOOLED` (conexión directa de Neon) en tu `.env.local` apuntando a la base real. **No pegues la URL en el chat ni en Git.**
2. `npm run db:migrate`. Drizzle aplica las migraciones con `when` mayor al último registrado, cada una dentro de una transacción: si una falla, esa se revierte entera.
3. Repetí las consultas 1.3 y 1.4: ahora todo debe figurar registrado y presente.

`0012` es **solo aditiva** (tablas nuevas, columnas nuevas con valor por defecto o nulas, índices). No borra ni modifica filas existentes. El código anterior sigue funcionando con `0012` aplicada, por eso el orden correcto es **migrar primero, desplegar después**.

### 1.6 Vuelta atrás
Restaurar la rama de respaldo del paso 0. (No te doy un `DROP` manual: no lo probé y con datos reales es más seguro restaurar.)

---

## 2. Reservas vencidas, conciliación y frecuencia

### 2.1 Frecuencia de la tarea programada (decisión 1)
Verifiqué la documentación de Vercel (https://vercel.com/docs/cron-jobs/usage-and-pricing):

| Plan | Intervalo mínimo | Precisión |
|---|---|---|
| Hobby | una vez al día | ±59 minutos |
| Pro / Enterprise | una vez por minuto | por minuto |

En Hobby, una expresión como `*/5 * * * *` **hace fallar el despliegue**. **No sé cuál es tu plan** (no tengo acceso a tu cuenta), así que **no cambié `vercel.json`**: sigue diario. Para decidir:
- Si tu proyecto está en **Pro** (o superior): cambiá en `vercel.json` `"schedule": "0 9 * * *"` por `"schedule": "*/5 * * * *"` y desplegá. Sin costo adicional por el cron en sí (se factura como una función normal, con su uso incluido en el plan).
- Si está en **Hobby**: no subas de plan solo por esto (generaría un costo). La alternativa sin costo está en 2.2.
- Alternativas externas que **no contraté ni recomiendo sin tu aprobación**: un planificador externo (por ejemplo GitHub Actions programado, cron-job.org) llamando `curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://shop.azulclaritocr.com/api/cron/payments-reconcile`. Límites: GitHub programa como mínimo cada 5 min y puede retrasar las ejecuciones; en repositorios privados cada ejecución se factura por minuto contra los minutos incluidos de tu plan de GitHub (cada 5 min son ~8 600 ejecuciones al mes, probablemente por encima del cupo gratuito: verificalo antes). Un servicio externo requiere una cuenta y guardar allí tu `CRON_SECRET`.

### 2.2 Qué ya NO depende del cron (decisión 3)
Una reserva vencida **nunca se libera sin consultar antes a Tilopay** si ese pedido se pagó (`settleExpiredOrder`). Si se pagó, el pedido se confirma; si no, se cancela y el stock vuelve. Si Tilopay no responde, se espera (hasta 24 h después del vencimiento) en vez de liberar a ciegas.

| Disparador | Cuándo | Efecto |
|---|---|---|
| Página de producto, listado de la tienda, home | Antes de leer el inventario | Libera vencidas (hasta 5), como máximo cada 5 s por instancia |
| Carrito (ver, agregar, cambiar cantidad) | Antes de validar stock | Igual |
| `/checkout` y compra que choca con "sin stock" | Sin freno | Resuelve y reintenta una vez |
| Cualquiera de las anteriores | En segundo plano, máx. 1 vez por minuto por instancia | Conciliación completa: verifica pagos cuyo retorno no llegó (a los 2+ min), vigila cancelados 72 h, reintenta correos |
| Botón del panel / "Verificar mi pago" | Manual | Verificación |
| Tarea programada | Según 2.1 | Conciliación completa (red de seguridad) |

Garantías (probadas con el simulador, ver 5.1): la liberación es **una sola sentencia atómica** protegida por `status = 'PENDING'` (si varias visitas/instancias coinciden, solo una libera y suma el stock una vez); si el pago llegó, **no se libera**; si Tilopay no responde, **no se libera**; las páginas esperan como máximo 3 s y, si no se pudo resolver, no reintentan durante 60 s; una falla de esta lógica nunca rompe una página.

**Límite honesto:** sin tráfico no hay disparadores. Con el cron diario, un pago cuya clienta cerró la pestaña puede tardar horas en confirmarse (y su correo, igual) si nadie visita la tienda. Con tráfico normal, ≤ 1–2 minutos.

**Webhook:** la documentación pública dice que para compras Tilopay hace **un solo intento sin reintentos**. Aun con webhook, la conciliación sería necesaria.

## 3. Contrato de Tilopay: lo verificado y los supuestos pendientes

Revisé la especificación OpenAPI pública (`tilopay.com/developers/openapi.json`; solo la primera parte del archivo: `processPayment`, `consult` y las rutas) y la página de webhooks. **No pude leer** "Entornos: pruebas y producción" ni "Cómo leer una respuesta de error" (el permiso de lectura expiró).

**Verificado en la documentación:**
- `processPayment`: los 27 campos requeridos (los envío todos); `returnData`, `hashVersion`, `token_version` opcionales. Respuesta: `type`, `html`, `url`.
- `consult`: request `key`, `orderNumber`, `merchantId`; respuesta con `type`, `message` y `response[]` (campos `id_tilopay`, `orderNumber`, `amount`, `currency`, `code`, `response`, `environment`, `type`, `date`…).
- La especificación **no define enumeraciones** de `code`, `type` ni `environment`: solo ejemplos ("1", "Payment", "Test").
- Webhook: sin esquema ni autenticación públicos; `orderHash` "no es público"; compras = 1 intento.

### Supuestos míos — NINGUNO está confirmado por Tilopay

| ID | Supuesto | Dónde está en el código | Si es falso | Cómo se valida |
|---|---|---|---|---|
| A1 | **`code == "1"` en `consult` = pago aprobado** (la documentación lo dice para el retorno del navegador; el ejemplo de `consult` muestra "1"; yo lo extiendo) | `evaluateConsult` (`domain/tilopay.ts`) | Un pago aprobado no se reconocería (queda pendiente/revisión) o, peor, un código "1" con otro significado se tomaría por aprobado | S1, S2, pregunta 9 a Tilopay |
| A2 | **Cualquier `code` distinto de "1" = rechazo** | `evaluateConsult` | Un estado intermedio ("en proceso") marcaría el intento FAILED. No se pierde dinero: el pedido sigue pendiente y una verificación posterior aún puede aprobarlo | S2, S4, pregunta 9 |
| A3 | **`environment` = "Test" (sin distinguir mayúsculas) identifica transacciones de prueba**; en sandbox cualquier otro valor NO se confirma | `evaluateConsult` | Con otro texto en pruebas, ninguna compra de sandbox se confirmaría (falla seguro) | S1, pregunta 9 |
| A4 | **No sé qué valor devuelve `environment` en producción.** En modo producción solo se rechaza "Test" y se acepta cualquier otro | `evaluateConsult` | Un valor inesperado se aceptaría. **Por eso producción sigue bloqueada hasta resolver esto** | Pregunta 9; antes de producción convertir a lista cerrada de valores |
| A5 | **`type` no se usa**: no distingo pagos de reembolsos, reversos o contracargos | `parseConsultResponse` / `evaluateConsult` | Un reembolso posterior no se detecta; no se rastrean reembolsos externos | Pregunta 9 y 14 |
| A6 | **`amount` llega como decimal en texto** ("26600.00"; hasta 4 decimales) y **`currency` como código ISO** ("CRC") | `amountToCents`, `evaluateConsult` | Si el formato difiere, nunca se confirma (falla seguro) | S1, S10 |
| A7 | **"No encontrado"** = `response` vacío; una respuesta de forma desconocida = "no disponible" (no cancela nada) | `parseConsultResponse` | Si Tilopay responde un error con HTTP 200 y otro formato, se trata como no disponible | S7, pregunta 9 |
| A8 | **`orderNumber` con sufijo (`AC-…-2`)** es válido y su largo es aceptado | `providerOrderNumber` | Fallarían los reintentos tras un rechazo | S3, pregunta 10 |
| A9 | **Valores fijos** `capture="1"`, `subscription="0"`, `platform="api"` (tomados de ejemplos) | `buildProcessPaymentBody` | La sesión se rechazaría o capturaría distinto a lo esperado | S1 |
| A10 | **`billToState` con formato `CR-SJ`, `CR-A`, `CR-C`, `CR-H`, `CR-G`, `CR-P`, `CR-L`** | `CR_STATE_CODES` | Sesión rechazada o dirección mal registrada | S1 |
| A11 | **`returnData` en hexadecimal (48 caracteres) vuelve intacto** (la doc recomienda base64) | `session.ts`, ruta de retorno | No se podría asociar el retorno al intento (la conciliación igual lo recupera) | S8 |
| A12 | **La consulta devuelve el resultado en tiempo real** (sin demora tras pagar) | `verifyPayment` | Se vería "pendiente" brevemente; la conciliación reintenta | S1, S5 |
| A13 | **El formulario de pago puede seguir usable tras cancelar el pedido** (o no): desconocido | Vigilancia 72 h de cancelados | Si dura menos, la vigilancia sobra; si dura más, podría haber cobros más tardíos | S12, pregunta 12 |
| A14 | **`processPayment` no es idempotente** y repetir un `orderNumber` falla o duplica | Diseño de intentos | Si es idempotente, el diseño sigue siendo válido | S13 |
| A15 | ~~Host único para pruebas y producción~~ **DOCUMENTADO** ("No existe un host de sandbox"). Sigue sin confirmar que `environment` sea la señal del modo (la doc cita el campo `test` del SDK) | `TILOPAY_API_HOST` | — | Pregunta 5, S1 |
| A16 | ~~Respuesta de `login`~~ **DOCUMENTADO** (`access_token`, `token_type`, `expires_in`). Pendiente: que las credenciales del panel comercial en modo pruebas sirvan para la API | `client.ts` | El login falla (seguro; no cobra) | S0 |

**Compuerta:** producción permanece bloqueada (sandbox por defecto + doble confirmación explícita) y **no debe activarse hasta que A1–A4, A6–A7 y A13 estén validados en sandbox por escrito**, y A4 convertida a una lista cerrada con los valores oficiales.

Lo que **no** depende de supuestos: el navegador nunca decide (el retorno solo dispara una consulta servidor a servidor); `PAID` solo se asigna con una verificación coincidente; una reserva no se libera sin comprobar el pago; producción exige dos variables explícitas.

---

## 4. Qué tenés que conseguir de Tilopay (sandbox)

**No sé si ya tenés acceso al portal comercial ni cómo se llama cada pantalla**, así que no te indico menús. Pedí/confirmá con Tilopay (soporte@tilopay.com, o quien sea tu ejecutivo):

Credenciales y acceso
1. Que tu cuenta comercial esté **activa y con acceso técnico/API** (y quién de tu equipo tiene acceso).
2. `apiuser` y `password` de la API **de pruebas**.
3. La `key` de API **de pruebas**.
4. El `merchantId` (si la consulta lo requiere para tu cuenta).
5. **Cómo se activa el modo de pruebas** y cómo comprobar que está activo. (Mi implementación usa el campo `environment` de `consult` como señal; necesito que Tilopay confirme su valor en pruebas y en producción.)
6. Si las credenciales de pruebas y producción **son distintas** y cómo se distinguen.
7. Lista oficial de **tarjetas de prueba** (aprobada, rechazada, 3-D Secure) y datos de vencimiento/CVV de prueba.
8. Monedas habilitadas para tu comercio (hoy la tienda usa CRC) y métodos de pago habilitados (¿3-D Secure obligatorio?).

Contrato que falta
9. Valores posibles de `code`, `type` y `environment` en `consult`, y qué devuelve `consult` si el `orderNumber` no existe.
10. Largo máximo y caracteres permitidos de `orderNumber`; si se admite un sufijo como `-2`.
11. Especificación del webhook de `processPayment` (cuerpo, cabeceras, autenticación) y el algoritmo de `orderHash` — solo si decidís agregar webhook.
12. **Vigencia de la URL del formulario de pago** (¿cuánto tiempo puede pagarse después de generada?).
13. Si hay que **registrar el dominio** de retorno (`redirect`) y cuál es el origen exacto.
14. Cómo se hacen **reembolsos** (portal o API; tipos de `processModification`).
15. Límites de uso (peticiones por minuto) de `login` y `consult`.

Texto listo para enviar:

> Hola. Somos Azul Clarito (shop.azulclaritocr.com) y estamos integrando Hosted Payment Page con la API v1 en modo pruebas. Necesitamos: (1) confirmar que nuestra cuenta tiene acceso a la API y el procedimiento para activar el modo de pruebas; (2) apiuser, password, key y merchantId de pruebas y si difieren de los de producción; (3) tarjetas de prueba (aprobada, rechazada, 3DS); (4) los valores posibles de `code`, `type` y `environment` en `/api/v1/consult` y la respuesta cuando el orderNumber no existe; (5) largo máximo y caracteres permitidos de orderNumber; (6) vigencia de la URL del formulario de pago; (7) si debemos registrar el dominio de `redirect`; (8) procedimiento de reembolsos; (9) monedas y métodos habilitados; (10) límites de uso de la API; (11) la especificación del webhook de processPayment y el algoritmo de orderHash. Gracias.

Además (no es de Tilopay): el dominio `azulclaritocr.com` debe estar verificado en Resend para enviar desde `tienda@azulclaritocr.com`.

---

## 5. Pruebas

### 5.1 Ya ejecutadas — CON SIMULADOR (no prueban a Tilopay)
`vitest` 361/361; e2e de Tilopay (`run6`) 84/84: aprobado, rechazado, cancelado, error de sesión, retorno sin confirmación, retorno falsificado, monto/moneda/entorno distintos, pedido ya pagado, stock insuficiente, última unidad entre dos compradoras, sin tarifa de envío, falla de Resend, vencimiento y recuperación, cobro tardío con aviso y resolución, cobro tras cancelar sin volver, retornos simultáneos, panel SUPER_ADMIN/STAFF, sin secretos en HTML/logs, y (nuevo) liberación de reservas vencidas desde producto/carrito: sin pago → libera; con pago → no libera; Tilopay caído → no libera; 12 llamadas simultáneas → una sola liberación; compra simultánea posterior. Pago deshabilitado sin credenciales / con producción sin confirmar: 4/4 y 4/4. No existen pruebas de webhook porque no hay endpoint.

### 5.2 A ejecutar en el SANDBOX REAL (cuando haya credenciales)
Reglas: solo con `TILOPAY_MODE=sandbox`, **jamás con tarjeta real**; registrá resultados (códigos, textos, capturas) sin pegar secretos. Para cada prueba, anotá la respuesta cruda de `consult` (campos `code`, `type`, `environment`, `amount`, `currency`).

| # | Prueba | Resultado esperado | Supuesto que valida |
|---|---|---|---|
| S0 | Con credenciales correctas, el panel (SUPER_ADMIN) dice "Pasarela: modo de PRUEBAS"; con una contraseña errónea el checkout no cobra y muestra mensaje seguro | Sin filtrar credenciales | Login/cliente |
| S1 | Compra con tarjeta aprobada de prueba | Pedido PAGADO; correo a la clienta y al equipo; `consult`: `code` "1", `environment` "Test" | Supuestos 1, 3, 4 |
| S2 | Tarjeta rechazada de prueba | Intento FAILED, pedido PENDIENTE; anotar el `code` exacto | Supuesto 2 |
| S3 | Tras S2, "reintentar" con tarjeta aprobada | Se acepta `orderNumber` con sufijo (`-2`) y queda PAGADO | Supuesto 7 |
| S4 | Flujo 3-D Secure de prueba | Se completa y confirma | Flujo HPP completo |
| S5 | Pagar y **cerrar la pestaña** antes de volver | En ≤ 7 min (con tarea cada 5 min) el pedido pasa a PAGADO y llegan los correos | Recuperación |
| S6 | Abrir el formulario de Tilopay y volver sin pagar / cancelar allí | Pedido sigue PENDIENTE; "Verificar mi pago" no confirma nada | "No encontrado" / cancelación |
| S7 | Consultar un `orderNumber` inexistente (script de solo lectura) | Anotar la respuesta exacta | Supuesto 5 |
| S8 | Comprobar que `returnData` vuelve idéntico (hex) | Coincide | Supuesto 9 |
| S9 | Retorno falsificado a mano (`code=1` sin pago) | No confirma | Seguridad |
| S10 | Montos con decimales/IVA (p. ej. total ₡26 600 y otro con céntimos) | `amount` del consult coincide; no cae en "mismatch" | Supuesto 4 |
| S11 | Pedido vence (30 min) sin pagar | Se cancela solo y libera stock (con visita al checkout y con la tarea) | Reserva |
| S12 | Cancelar el pedido y luego **pagar en el formulario viejo** | Si Tilopay lo permite: aviso "ACCIÓN REQUERIDA", pedido sigue CANCELADO, alerta visible | Cobro tardío / vigencia de URL |
| S13 | Reintentar la creación de sesión con el mismo `orderNumber` (solo observar) | Anotar la respuesta de Tilopay | Idempotencia de `processPayment` |
| S14 | Correo real: llegada, remitente `tienda@azulclaritocr.com`, spam | Recibido | Resend |
| S15 | La tarea: sin cabecera → 401; con `Bearer` correcto → 200 con resumen | OK | Planificador |
| S16 | Dos navegadores, última unidad | Solo una obtiene pedido | Reserva (ya cubierta por simulador/BD) |
| S17 | Reserva vencida real (30 min) sin pagar, luego abrir la página del producto | Se libera y el producto vuelve a estar disponible | Libera tras consulta real (A1, A7) |
| S18 | Reserva vencida con pago aprobado en Tilopay, luego abrir el producto | No se libera; pedido PAGADO | A1 |

Antes de pedir producción: S1–S12 en verde, preguntas 9–12 respondidas por escrito, y tu aprobación explícita.

---

## 6. Si Tilopay confirma un pago después de cancelado el pedido

**Qué hace el sistema (verificado con el simulador):**
1. Detección: por el retorno de la clienta, la tarea programada (vigila 72 h tras la cancelación) o el botón "Verificar con Tilopay".
2. El pago queda `PAID`, **el pedido sigue `CANCELLED`** (nunca se reactiva solo), el stock **no se toca**, y el pedido queda con la alerta **"Requiere revisión"** (insignia "Revisar" en la lista).
3. Se envía **una sola vez** un correo interno "⚠ ACCIÓN REQUERIDA" a `ADMIN_NOTIFY_EMAIL` con el pedido, la transacción y el motivo.
4. La clienta **no** recibe "pago confirmado". Si abre su enlace, ve que recibimos su pago, que el pedido ya estaba cancelado y que el equipo la contactará.

*Defectos que corregí en esta revisión:* antes, la clienta recibía un correo de "Pago confirmado" y el equipo uno de "Venta confirmada" para un pedido cancelado, sin alerta distinta; y un cobro realizado tras cancelar, sin que la clienta volviera, **nunca se detectaba**.

**Procedimiento del equipo (STAFF o SUPER_ADMIN):**
1. Abrí el pedido desde el correo o desde la lista (insignia "Revisar").
2. Copiá el id de transacción y confirmá el cobro en el portal de Tilopay.
3. Decidí (lo recomendado es **reembolsar**):
   - **Reembolso:** hacelo en el portal de Tilopay (el sistema no reembolsa: el contrato de `processModification` no está documentado) y avisale a la clienta por correo.
   - **Honrar la compra:** si hay stock, prepará el envío fuera del sistema o pedile que haga un pedido nuevo y reembolsá el primero. El sistema **no** convierte un pedido cancelado en pagado (no existe "marcar como pagado").
4. En el pedido, escribí la **nota de resolución** (mínimo 15 caracteres: qué hiciste, número de reembolso, fecha) y tocá "Marcar la alerta como resuelta". Queda registrada tu persona, la nota y la fecha; el pedido y el pago no cambian.
5. La alerta no desaparece sola: **mientras exista, el pedido aparece con "Revisar"**. Así no queda un cobro sin atender.

Casos relacionados con la misma alerta: segundo pago aprobado en un pedido ya pagado (posible cobro doble), y monto/moneda/entorno que no coinciden.

**Decisión tomada (tuya):** el pedido **no se reactiva automáticamente**; no hay reembolsos automáticos (no existe contrato oficial); el equipo resuelve a mano y la nota es obligatoria. No hay ninguna función de reactivación.

---

## 7. Qué NO cambió
Pagos reales deshabilitados (sandbox por defecto; producción exige `TILOPAY_MODE=production` **y** `TILOPAY_CONFIRM_PRODUCTION=SI_COBRAR_DE_VERDAD`). Sin commit, push, despliegue ni migraciones en tu Neon.
