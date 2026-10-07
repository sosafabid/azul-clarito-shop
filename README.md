# Azul Clarito Shop

Tienda oficial de Azul Clarito — **`shop.azulclaritocr.com`**.

Este repositorio es la **foundation** (base) del proyecto: arquitectura, base de
datos preparada, estructura de rutas, autorización del lado del servidor e
identidad visual inicial. **Todavía no hay** pagos, checkout, emails, envíos
automáticos (ver [Qué NO está implementado](#qué-no-está-implementado-todavía)).

| | |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 · TypeScript |
| Estilos | Tailwind CSS 4 (tokens de marca en `src/app/globals.css`) |
| Base de datos | PostgreSQL en **Neon** · **Drizzle ORM** + Drizzle Kit |
| Pruebas | Vitest |
| Hosting previsto | Vercel |

---

## 1. Requisitos

- **Node.js 20.9 o superior** (recomendado: Node 22 LTS) — `node -v`
- **npm** (viene con Node) — `npm -v`
- **Git** — `git --version`
- **VS Code** (recomendado)
- Una cuenta gratuita de **[Neon](https://neon.tech)** *(solo cuando quieras conectar la base de datos; no hace falta para ver la tienda funcionando)*

## 2. Instalación

```bash
# dentro de la carpeta del proyecto
npm install
```

## 3. Variables de entorno

```bash
cp .env.example .env.local
```

Después abrí `.env.local` y completá lo que necesites. Con los valores por
defecto **la tienda ya funciona en tu computadora** (no pide base de datos todavía).

| Variable | Para qué sirve | ¿Cuándo hace falta? |
|---|---|---|
| `DATABASE_URL` | Conexión a Neon (con pooling) | Al usar la base de datos |
| `DATABASE_URL_UNPOOLED` | Conexión directa de Neon, para migraciones | Opcional (recomendada) |
| `AUTH_SECRET` | Reservada para cuentas de clientas | Todavía no se usa (el login del panel no la necesita) |
| `BLOB_READ_WRITE_TOKEN` | Almacenamiento de imágenes (Vercel Blob) | Para SUBIR archivos desde el panel (por URL no hace falta) |
| `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFY_EMAIL` | Emails | Cuando se conecte Resend |
| `PAYMENT_PROVIDER`, `PAYMENT_PROVIDER_SECRET` | Pagos | Cuando se elija proveedor |
| `NEXT_PUBLIC_SITE_URL` | URL pública de la tienda | En Vercel: `https://shop.azulclaritocr.com` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Correo público de contacto | Opcional |

> ⚠️ **`.env.local` nunca se sube a GitHub** (está en `.gitignore`). No pegues
> claves reales en `.env.example`: ese archivo sí se sube y solo lleva placeholders.

## 4. Ejecutar localmente

```bash
npm run dev
```

Abrí <http://localhost:3000>. Rutas disponibles:

| Ruta | Estado |
|---|---|
| `/` | Home temporal (identidad visual base) |
| `/shop` | **Lee productos ACTIVOS desde PostgreSQL** (si no hay ninguno, "Próximamente") |
| `/shop/[slug]` | **Ficha de producto desde PostgreSQL**: nombre, descripción, precio, imagen (si existe) y disponibilidad. Slug inexistente o inactivo → 404 |
| `/cart` | **Carrito** (invitada o con sesión): líneas, cantidades, eliminar, subtotal y estado vacío |
| `/checkout` | **Resumen del checkout**: provincia/cantón (país fijo Costa Rica), "Envío nacional", subtotal, impuestos, envío y total (calculados en el servidor). Todavía sin pago ni orden |
| `/admin/taxes`, `/admin/shipping` | **Impuestos** y **Envíos**: el equipo los ve; solo SUPER_ADMIN los cambia |
| `/account/register`, `/account/login` | **Crear cuenta** (nombre, correo, teléfono opcional, contraseña y consentimientos) e **ingresar** |
| `/account` | **Mi cuenta** (requiere sesión): editar datos, ver y cambiar consentimientos (con historial), cambiar contraseña y eliminar la cuenta |
| `/account/orders` | "Próximamente" (requiere sesión) |
| `/terminos`, `/privacidad` | **Textos legales provisionales** (versionados; ver "Cuentas de clientas y consentimiento") |
| `/admin/login` | Inicio de sesión del equipo (correo + contraseña) |
| `/admin/products` | Listado con **búsqueda**, **filtros** (Todos / Activos / Ocultos / Archivados) y acciones por estado: publicar, ocultar, archivar, restaurar |
| `/admin/products/new` | Crear producto: datos, categoría/colección (existentes o nuevas), precio, costo, moneda, stock inicial, estado inicial, destacado/nuevo/edición limitada e imágenes |
| `/admin/products/[id]` | Ficha: edición, economía (utilidad, margen, valor del inventario…), galería de imágenes, variantes y zona de peligro |
| `/admin/products/[id]/eliminar` | Eliminación definitiva con confirmación escrita (solo SUPER_ADMIN, solo sin historial de ventas) |
| `/admin/inventory` | Disponible / reservado / vendido, con valor al costo y de venta |
| `/admin`, `/admin/orders`, `/admin/customers` | `/admin` es el panel; pedidos y clientes: "Próximamente". **Todo `/admin` exige iniciar sesión** |
| `/robots.txt`, `/sitemap.xml` | Generados automáticamente |

## 5. Comandos de base de datos

Antes de usarlos, poné tu cadena de Neon en `.env.local` (`DATABASE_URL`, y si
podés `DATABASE_URL_UNPOOLED`).

```bash
npm run db:generate   # crea una migración SQL nueva (en /drizzle) a partir de los cambios en src/db/schema
npm run db:migrate    # aplica las migraciones pendientes en la base de datos
npm run db:push       # aplica el schema directo, SIN migración (solo para experimentar en una rama de desarrollo)
npm run db:studio     # abre Drizzle Studio para ver/editar datos
npm run db:check      # verifica que las migraciones sean consistentes
```

> Las migraciones usan el driver `pg` (devDependency, solo para Drizzle Kit) con la conexión
> **directa** `DATABASE_URL_UNPOOLED`; la app en runtime usa `@neondatabase/serverless`. Al migrar
> debe verse `Using 'pg' driver for database querying`. Si aparece `Using '@neondatabase/serverless'
> driver`, falta instalar `pg` (`npm install --save-dev pg`).

### Probar la conexión y crear el primer administrador

```bash
npm run db:ping       # prueba mínima: SELECT count(*) FROM products. Solo imprime
                      #   {"database":"connected","status":"ok",...}; nunca la URL ni credenciales
npm run admin:create -- --email vos@dominio.com --name "Tu nombre"   # crea (o actualiza) un SUPER_ADMIN
npm run admin:create -- --email persona@dominio.com --role STAFF     # persona del equipo sin permiso de eliminar
```

- La contraseña se pide por terminal **sin mostrarla** (mínimo 12 caracteres) y nunca se pasa por argumentos.
- Si el correo ya existe, se actualiza su contraseña y rol, se reactiva la cuenta, se quita el bloqueo y se cierran sus sesiones.
- **No hay seed ni productos de ejemplo:** el catálogo se carga a mano desde `/admin/products`.
- La prueba de conexión es un **script de terminal**, no una ruta web: no hay endpoint público de diagnóstico.

**Primera vez con Neon**

1. Creá un proyecto en Neon y copiá la cadena de conexión a `.env.local`.
2. `npm run db:migrate` → crea las 14 tablas, los enums, la secuencia de números de pedido y las restricciones.

**Flujo habitual al cambiar el schema:** editar `src/db/schema/*` → `npm run db:generate`
→ revisar el SQL generado en `drizzle/` → `npm run db:migrate` → commitear **el schema y la migración juntos**.

> Recomendación: usá una **rama de Neon** distinta para desarrollo y otra para producción.

## 6. Calidad y build

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm test            # pruebas unitarias (Vitest)
npm run build       # build de producción
npm start           # sirve el build (después de npm run build)
```

El build **no necesita** `DATABASE_URL`: la conexión a la base de datos es
perezosa (se abre recién cuando una consulta la pide).

## 7. Estructura del proyecto

```
src/
├── app/                    Rutas (App Router) — solo UI y composición
│   ├── (store)/            Páginas públicas (con header y footer de la tienda)
│   │   ├── page.tsx        /
│   │   ├── shop/           /shop y /shop/[slug]
│   │   ├── cart/  checkout/  account/
│   ├── admin/              Panel administrativo (layout con guard de servidor)
│   ├── layout.tsx          Layout raíz: tipografías, metadata, Open Graph
│   ├── robots.ts  sitemap.ts  icon.png  apple-icon.png
├── components/             UI reutilizable (ui/, layout/, home/, admin/)
├── config/                 Configuración central
│   ├── site.ts             Nombre, dominio, moneda, contacto, redes (PÚBLICO)
│   ├── server.ts           Config de solo servidor (pagos, email, auth)
│   ├── routes.ts  navigation.ts
├── domain/                 Reglas de negocio PURAS (sin BD, sin React)
│   ├── roles.ts  permissions.ts  order-status.ts  money.ts  stock.ts  …
├── db/
│   ├── index.ts            Cliente Neon + Drizzle (perezoso, solo servidor)
│   └── schema/             Tablas, enums y relaciones
├── server/                 Todo lo que corre SOLO en el servidor
│   ├── auth/               session.ts (por implementar) + guards.ts (autorización)
│   ├── services/           catalog · cart · checkout · inventory · payments
│   │                       · orders · fulfillment · shipping · email
│   └── env.ts
├── types/                  Tipos compartidos (incluye los tipos públicos del catálogo)
└── lib/                    Utilidades
drizzle/                    Migraciones SQL generadas (se commitean)
drizzle.config.ts           Configuración de Drizzle Kit
```

**Reglas de la arquitectura**

- `domain/` no importa nada de servidor ni de React → lo usan schema, servicios y UI.
- Todo archivo que toca la base de datos o secretos empieza con `import "server-only"`:
  si alguien lo importa desde un componente cliente, **el build falla**.
- Las etapas de la compra (`catalog → cart → checkout → payments → orders → fulfillment → shipping → email`)
  **no se importan entre sí**; solo `checkout/` las orquesta. Detalle en
  [`src/server/services/README.md`](src/server/services/README.md).

## 8. Conectar con GitHub y Vercel

### GitHub

1. En GitHub creá un repositorio **vacío** (sin README ni .gitignore) llamado `azul-clarito-shop`.
2. En la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Foundation de Azul Clarito Shop"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/azul-clarito-shop.git
git push -u origin main
```

Antes del primer `commit`, comprobá que no se suba nada sensible: `git status`
**no** debe listar `.env.local`.

### Vercel

1. En <https://vercel.com> → **Add New → Project** → importá el repositorio. Vercel detecta Next.js solo.
2. En **Environment Variables** cargá (Production y Preview): `DATABASE_URL`,
   `NEXT_PUBLIC_SITE_URL=https://shop.azulclaritocr.com` y las demás que ya se usen.
   Para subir imágenes: Storage → Blob → conectarlo al proyecto (crea `BLOB_READ_WRITE_TOKEN`).
   Después de desplegar, creá el administrador de producción con `npm run admin:create` apuntando a esa base.
3. Aplicá las migraciones a la base de datos de Neon **desde tu computadora**
   (`npm run db:migrate` con la cadena de producción en `.env.local`); Vercel no
   las ejecuta automáticamente.
4. **Dominio:** Project → Settings → **Domains** → agregá `shop.azulclaritocr.com`.
   Vercel te muestra el registro DNS exacto que hay que crear (normalmente un
   `CNAME` para el subdominio `shop`) en el lugar donde administrás el DNS de
   `azulclaritocr.com`.
5. Cada `git push` a `main` despliega a producción; las demás ramas generan *previews*.

## Decisiones de diseño importantes

- **Dinero = enteros.** Nunca decimales/float. CRC se guarda en colones enteros
  (`12000` = ₡12.000); USD en centavos. Formato con la convención de Azul Clarito
  (`₡12.000`) en `src/domain/money.ts`.
- **`cost` es interno.** Las consultas públicas seleccionan solo
  `publicProductColumns` y los mapeadores `toPublicProduct/Variant/Image`
  copian campo por campo (lista blanca), así que el costo no puede filtrarse por
  descuido. Hay pruebas que lo garantizan (`catalog/public.test.ts`).
- **Snapshot de precio.** `order_items` guarda nombre, SKU, precio y costo
  *al momento de la compra*; el pedido no cambia si el producto cambia después.
  La dirección también se copia al pedido.
- **Anti-overselling.** `inventory` separa `available / reserved / sold`, tiene
  CHECK de no-negativos y un índice único por producto/variante. La reserva real
  deberá ser una sentencia atómica condicionada (`UPDATE … WHERE available_stock >= n`);
  la regla está descrita en `src/domain/stock.ts`.
- **Autenticación real y autorización en el servidor (falla cerrado).** El panel usa correo + contraseña
  (hash scrypt con sal) y sesiones en la tabla `sessions`: la cookie (`HttpOnly`, `SameSite=Lax`, `Secure` en
  producción) lleva un token aleatorio y en la base solo se guarda su hash. El **rol se lee de la base en cada
  petición**, así que quitar un permiso o desactivar una cuenta surte efecto al instante. Sin sesión → login;
  con sesión sin permiso → 404. Protecciones del login: mensaje genérico, tiempo equilibrado, bloqueo de 15
  minutos tras 5 intentos fallidos (por cuenta; un atacante podría bloquear a propósito una cuenta, a cambio de
  que no se pueda adivinar la clave). No existe ningún atajo de desarrollo que salte el login.
  Un `layout` no protege las Server Actions: **cada una vuelve a exigir el permiso** (una prueba lo verifica).
- **Roles:** `CUSTOMER` no entra al panel. `STAFF` administra el catálogo. **Eliminar definitivamente** (producto o
  variante) es solo de `SUPER_ADMIN` (permiso `products:delete`).
- **Pagos y emails son adaptadores.** `payments/types.ts` define una interfaz
  genérica (no asume ningún proveedor); `email/` hoy no envía nada. Cambiar de
  proveedor no toca pedidos, carrito ni checkout.
- **El carrito guarda solo ids y cantidades.** Los precios se vuelven a leer
  en el servidor al hacer checkout; nunca se confía en un precio del navegador.
- **Limitación del driver `neon-http`:** no soporta `db.transaction()`. Se usan
  sentencias atómicas condicionadas o `db.batch([...])`; si hiciera falta una
  transacción interactiva se agrega un cliente `neon-serverless` (WebSocket).

## Catálogo, panel y economía del producto

- **Una sola capa de conexión:** `src/db/client.ts` (fábrica `neon-http`) → `src/db/index.ts` (`getDb()`, perezoso,
  `server-only`). La usan la app y los scripts. Lee `DATABASE_URL`; nunca se escribe ni se imprime la URL.
- **Escrituras atómicas sin transacciones interactivas** (el driver HTTP no las soporta): `db.batch([...])`
  para producto + inventario + auditoría, y una sola sentencia condicionada para cambiar stock.
- **Stock y concurrencia:** el formulario envía el stock que viste al abrirlo; si cambió mientras editabas
  (p. ej. una reserva) y además lo modificaste, se rechaza en vez de pisar el dato. Reservado y vendido los gestiona
  el sistema (checkout/pedidos): se muestran pero no se editan a mano.
- **Auditoría:** cada cambio de precio, costo, moneda, stock y estado queda en `audit_logs` (usuario, producto, campo,
  valor anterior, valor nuevo, fecha). En local, la sesión de desarrollo se registra con `actor_user_id` nulo y su etiqueta
  en `metadata.actor`.
- **Utilidad bruta = precio − costo; margen bruto % = utilidad / precio × 100.** No es utilidad neta: no incluye gastos
  operativos, empaque, comisiones ni publicidad. Si el precio queda por debajo del costo, el formulario exige confirmación.
- **Lo público nunca ve el costo ni las cantidades:** las consultas de la tienda (`catalog/queries.ts`) no seleccionan
  `cost` y solo devuelven un estado de disponibilidad (disponible / pocas unidades / agotado). Pruebas de arquitectura
  (`src/architecture.test.ts`) fallan si el código público importa módulos de administración, si una Server Action no
  exige permiso antes de tocar la base, o si aparece una cadena de conexión en el código.
- **Cada Server Action vuelve a comprobar el permiso** (`requirePermission`): un `layout` no las protege.
- **Estados del producto:** *Activo* (en `/shop`) · *Oculto* (existe en el panel, no en `/shop`; usa el valor DRAFT de la base) ·
  *Archivado* (fuera del catálogo activo; filtro "Archivados") · *Eliminado* (borrado definitivo). Restaurar un archivado lo deja
  Oculto (publicarlo es una decisión aparte). Cada cambio de estado se hace con una sola sentencia que verifica el estado que
  la persona veía y deja su registro de auditoría.
- **Eliminación segura:** solo SUPER_ADMIN, con casilla de confirmación y escribiendo el SKU. Se bloquea si el producto aparece en
  `order_items` o registra unidades vendidas; la condición se evalúa dentro de la misma sentencia que borra. Si no se puede,
  se ofrece archivarlo. Se borran en cascada sus imágenes, variantes e inventario.
- **Variantes:** un producto sin variantes es simple (una fila de inventario). Al agregar la primera variante, el stock pasa a
  gestionarse por variante (el producto debe tener stock propio en 0 antes). Cada variante tiene SKU, opciones (Talla: M),
  precio/costo opcionales y su propio inventario.
- **Imágenes:** en la base solo se guarda la referencia (`product_images`). Se asocian por **URL https** o se **suben** a Vercel
  Blob (requiere `BLOB_READ_WRITE_TOKEN`; JPG/PNG/WebP/AVIF, máx. 4 MB por envío). Hasta 10 por producto, con principal, orden y texto
  alternativo. La tienda las muestra sin optimizar (`unoptimized`) hasta que se defina el dominio del CDN en `next.config.ts`.
- **Auditoría** (`audit_logs`): creación, edición (con lista de campos), cambios de precio/costo/moneda/stock (antes y después),
  publicar, ocultar, archivar, restaurar, eliminación, imágenes, variantes e inicios de sesión.

## Impuestos, envíos y totales del checkout

**No hay ninguna tasa ni tarifa precargada** (ni en el código ni en las migraciones): todo se define en `/admin/taxes` y `/admin/shipping`.

- **Subtotal** = Σ precio × cantidad de las líneas comprables. Los precios, el estado y el stock se **releen de PostgreSQL** (`getCartView`); nada llega del navegador.
- **Impuesto** (tabla `tax_rates` + `tax_rules`): una tasa activa a la vez, en puntos básicos (13 % = 1300). Se configura si los precios publicados **ya lo incluyen** o **se suma** al pagar, y el
  redondeo (por línea: al más cercano / abajo / arriba). Qué paga: reglas por **todos / categoría / producto (SKU)**, exento o sujeto; gana la más específica y, sin reglas, **nada** paga.
  Con impuesto incluido: impuesto = precio − precio ÷ (1 + tasa) y el total no lo suma otra vez.
- **Envío — solo Costa Rica y logística manual.** Por ahora la tienda envía **únicamente dentro de Costa Rica**: el checkout muestra el país fijo (sin selector), pide provincia (de las 7),
  cantón y código postal opcional, y el **servidor rechaza cualquier otro país** (`parseDestination` y el motor `computeTotals`). No hay integración con Correos de Costa Rica ni con ningún courier:
  se prepara el paquete, se lleva al servicio que corresponda y el seguimiento se anota a mano en el pedido (`orders.carrier`, `tracking_number`, `tracking_url`, `shipped_at`, `internal_notes`;
  estados PAGADO → PREPARANDO → EMPACADO → ENVIADO → ENTREGADO). La clienta ve **un único método, "Envío nacional"**, con la tarifa que Azul Clarito configure: es el primer método **activo** de tipo
  *Entrega a domicilio* (por prioridad); su nombre y descripción se editan en `/admin/shipping` (la migración 0006 lo crea, sin tarifas, solo si no hay ningún método). Los de *Retiro en persona* todavía no se ofrecen.
  **Tarifas** (`shipping_rates`) por zona: provincia(s), cantón(es) o código postal, con **nombre de zona** (GAM, Limón, Resto del país…) y varios valores separados por `;` (así la GAM se arma
  listando sus cantones); sin zona = todo el país. Rango de monto de pedido y **umbral de envío gratis** opcionales. Gana la tarifa más específica (a igual especificidad, la más barata); las zonas ignoran
  mayúsculas y tildes. **No hay ningún monto ni zona precargados**: se ingresan desde el panel (colones; sin conversión). Si falta tarifa para el destino: *"El envío para este destino todavía no está configurado."*
  (nunca "no disponible"). El costo real del courier es interno y no se muestra a la clienta.
- **Total** = subtotal + impuesto + envío (con impuesto incluido: subtotal + envío). Mientras falte la dirección o el método, el envío **no muestra ningún valor** y el total queda en "—".
  Si hay productos no disponibles o sin stock suficiente, el checkout no calcula total.
- **Un solo punto de cálculo:** `calculateCheckoutTotals()` (`src/server/services/checkout/totals.ts`, sobre las reglas puras de `src/domain/checkout.ts`). La URL del checkout solo trae
  `pais`, `provincia`, `ciudad`, `cp` y `envio`; cualquier otro parámetro (total, impuesto, precio…) se ignora y una prueba lo impide.
  La futura creación de la orden y el pago deberán llamar a esta MISMA función y usar `totals.total` y `totals.snapshot`.
- **Snapshot de la orden:** `orders.pricing_snapshot` (jsonb, opcional) está listo para congelar moneda, subtotal, impuesto (nombre, **tasa usada**, si estaba incluido, redondeo), método y tarifa de
  envío, destino y total. `toOrderAmounts()` lo convierte a las columnas de `orders` cumpliendo `total = subtotal + envío + impuesto` (con impuesto incluido, `subtotal` se guarda **neto**).
  Aún no se escribe: no hay creación de órdenes en esta fase. Cambiar una tarifa o la tasa nunca altera un pedido ya creado.
- **Preparado, no implementado:** envíos internacionales (la columna `country_code` y las tarifas por país existen, pero hoy todo se fuerza a Costa Rica), tarifas por peso, impuestos distintos por destino, varios impuestos a la vez, conversión de moneda, retiro en persona en el checkout, integración con Correos u otro courier.

## Carrito

- **Qué guarda:** solo ids y cantidades (`carts`, `cart_items`; sin columnas de precio ni costo). Nombre, imagen, **precio actual** y **stock** se leen
  de la base cada vez que se muestra o se modifica. Nunca se usa un precio que venga del navegador, y el costo no se selecciona en ninguna consulta del carrito.
- **Invitada:** cookie `ac_cart` (`HttpOnly`, `SameSite=Lax`, `Secure` en producción, 30 días) con un token aleatorio; en la base solo está su hash.
  Mirar el carrito no crea nada: el carrito nace al agregar el primer producto.
- **Con sesión:** un carrito por cuenta (`carts.user_id`). Un carrito pertenece a una cuenta **o** a una invitada, nunca a las dos (CHECK en la base).
- **Fusión:** al iniciar sesión o registrarse, el carrito de invitada se suma al de la cuenta (cantidades sumadas, sin pasar del stock; líneas en otra moneda se
  descartan), y se borran el carrito y la cookie de invitada. Si la fusión falla, no bloquea el ingreso.
- **Validación al agregar o cambiar cantidad (servidor):** producto existe y está ACTIVO → si tiene variantes, exige una variante ACTIVA de ese producto →
  precio actual → stock disponible → cantidad entera ≥ 1, limitada al stock y a un máximo de 20 por línea. Cada variante es una línea distinta; repetir
  producto/variante **suma** en la misma línea (una sola sentencia atómica, también con clics simultáneos).
- **Cambios mientras está en el carrito:** si el producto se oculta, archiva o se queda sin stock, la línea **no se elimina en silencio**: se marca
  "Este producto ya no está disponible", solo permite eliminar y no suma al subtotal. Con stock menor al pedido: "Solo quedan N" y botón "Ajustar a N".
- **Agregar al carrito NO reserva stock.** La reserva ocurrirá en el checkout. Un carrito admite una sola moneda y hasta 30 productos distintos.
- **Contador del header:** total de unidades, leído de la base en el servidor (por eso la portada y las páginas legales ahora se generan en cada visita).
- **Acciones públicas** (`src/server/actions/cart.ts`): aceptan solo ids y cantidades; verifican que la línea sea del carrito de quien la pide (pruebas de arquitectura).
- **Imágenes de productos:** ver "Imágenes" más arriba. Sin `BLOB_READ_WRITE_TOKEN` el panel lo explica y permite usar URLs; la subida tiene 2 reintentos y un tope de 25 s.

## Cuentas de clientas y consentimiento

- **Registro:** nombre, correo, teléfono (opcional), contraseña (mín. 12 caracteres) y consentimientos. Al terminar queda con la sesión iniciada.
  La cuenta nace **siempre como `CUSTOMER`**: el rol no viaja en el formulario ni se puede pedir desde él.
- **Consentimientos:** Términos y Privacidad son **obligatorios y se exigen en el servidor** (no basta la casilla del navegador); las casillas vienen
  **desmarcadas**. Comunicaciones comerciales es **opcional**. Cada aceptación o retiro es un **evento nuevo** en `user_consents` con la
  **versión del texto**, la fecha y el origen (`registration` / `account`): el historial no se edita ni se pisa. La persona lo ve y puede retirar
  el permiso de marketing en cualquier momento desde `/account`.
- **Versiones legales** en `src/config/legal.ts`. Si cambiás el contenido de `/terminos` o `/privacidad`, cambiá la versión (AAAA-MM-DD).
- **⚠️ Revisión legal pendiente.** Los textos son una **base** (referencian la Ley N.° 8968 y la PRODHAB) y **no son asesoría legal**. Mientras
  `legalConfig.reviewed` sea `false`, muestran un aviso de "texto provisional" y llevan `noindex`. Antes del lanzamiento: que una persona abogada
  los revise, completar `legalConfig.controller` (nombre/razón social, cédula, dirección del responsable), subir la versión y pasar `reviewed` a `true`.
  También conviene consultar si la base de datos de clientas debe inscribirse ante la PRODHAB.
- **Derechos sobre los datos:** acceso (se ve en `/account`), rectificación (editar nombre y teléfono), revocación (marketing) y eliminación.
  Eliminar la cuenta borra la persona, sus sesiones, direcciones y consentimientos; **los pedidos se conservan sin vínculo a la cuenta** y
  se quita su correo del registro de auditoría. Las cuentas del equipo no se eliminan desde ahí.
- **La auditoría de la cuenta no guarda datos personales:** solo qué campos cambiaron, nunca sus valores.
- **Contraseña:** hash scrypt con sal; al cambiarla se cierran las demás sesiones. El login (equipo y clientas) comparte la misma protección:
  mensaje genérico, tiempo equilibrado y bloqueo de 15 minutos tras 5 intentos fallidos.
- **Límites conocidos:** (1) el registro avisa si un correo ya existe (sin verificación por email no se puede evitar enumerar cuentas); (2) hay un
  freno global de 20 registros cada 10 minutos y un campo trampa contra bots, pero **no hay límite por IP**; (3) el correo no se verifica todavía.

## Seguridad de dependencias

`npm audit --omit=dev` (lo que corre en producción) → **0 vulnerabilidades**.

`npm audit` completo muestra avisos en herramientas de **desarrollo**
(`eslint-config-next` y `drizzle-kit`, por dependencias internas de terceros).
No se ejecutan en producción. **No ejecutes `npm audit fix --force`**: propone
bajar a versiones muy antiguas y rompería el proyecto; esos avisos se resuelven
cuando los autores publiquen sus actualizaciones.

## Qué NO está implementado todavía

- **Recuperar contraseña olvidada** y **verificar el correo**: ambos necesitan enviar emails y todavía no hay servicio de correo (`RESEND_API_KEY`). Hasta entonces, una clienta que olvide su contraseña no puede recuperarla sola.
- Descargar una copia de los datos personales (derecho de acceso en archivo)
- Revisión legal de `/terminos` y `/privacidad` (ver abajo)
- Gestión de usuarios del equipo desde el panel (hoy se crean con `npm run admin:create`)
- Importación de inventario real, subida de imágenes (almacenamiento/CDN), variantes en el panel y categorías en el panel
- Checkout real, órdenes, pagos y reserva de stock (el carrito ya existe, pero **no reserva** inventario)
- Limpieza automática de carritos de invitada abandonados (`carts.updated_at` ya queda guardado)
- Eventos de analytics del carrito (add_to_cart, view_cart…)
- Pagos (proveedor compatible con Costa Rica por elegir)
- Emails (Resend) y plantillas
- Cálculo de envíos (la primera versión será manual)
- Imágenes/productos reales (los bloques de la home son placeholders)

## Archivos `AGENTS.md` / `CLAUDE.md`

Los genera Next.js automáticamente (`next dev`) con instrucciones para
asistentes de IA. Se dejan commiteados para que no aparezcan como cambios
pendientes; no afectan al funcionamiento.
