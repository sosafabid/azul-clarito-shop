# Azul Clarito Shop

Tienda oficial de Azul Clarito — **`shop.azulclaritocr.com`**.

Este repositorio es la **foundation** (base) del proyecto: arquitectura, base de
datos preparada, estructura de rutas, autorización del lado del servidor e
identidad visual inicial. **Todavía no hay** pagos, checkout, emails, envíos
automáticos ni autenticación real (ver [Qué NO está implementado](#qué-no-está-implementado-todavía)).

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
| `AUTH_SECRET` | Secreto para firmar sesiones | Cuando se implemente la autenticación |
| `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFY_EMAIL` | Emails | Cuando se conecte Resend |
| `PAYMENT_PROVIDER`, `PAYMENT_PROVIDER_SECRET` | Pagos | Cuando se elija proveedor |
| `NEXT_PUBLIC_SITE_URL` | URL pública de la tienda | En Vercel: `https://shop.azulclaritocr.com` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Correo público de contacto | Opcional |
| `DEV_ADMIN_PREVIEW` | Ver `/admin` **solo en tu computadora** sin login | Solo desarrollo local |

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
| `/shop`, `/shop/[slug]` | "Próximamente" |
| `/cart`, `/checkout` | "Próximamente" |
| `/account`, `/account/orders` | "Próximamente" |
| `/admin`, `/admin/products`, `/admin/orders`, `/admin/inventory`, `/admin/customers` | "Próximamente" — **solo visibles con `DEV_ADMIN_PREVIEW=true` en local; en producción responden 404** |
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
   **No definas `DEV_ADMIN_PREVIEW`** (igual se ignora en producción).
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
- **Autorización en el servidor, falla cerrado.** `/admin` llama a
  `requireStaff()` antes de renderizar. Hoy no hay autenticación, así que **en
  producción `/admin` responde 404 siempre**. La excepción de desarrollo
  (`DEV_ADMIN_PREVIEW`) está bloqueada por código cuando `NODE_ENV=production`.
  Un `layout` no protege las Server Actions ni los Route Handlers: **cada uno
  debe llamar a `requireStaff()` / `requirePermission()`** por su cuenta. No
  confiar solo en un `middleware`/`proxy`.
- **Pagos y emails son adaptadores.** `payments/types.ts` define una interfaz
  genérica (no asume ningún proveedor); `email/` hoy no envía nada. Cambiar de
  proveedor no toca pedidos, carrito ni checkout.
- **El carrito guarda solo ids y cantidades.** Los precios se vuelven a leer
  en el servidor al hacer checkout; nunca se confía en un precio del navegador.
- **Limitación del driver `neon-http`:** no soporta `db.transaction()`. Se usan
  sentencias atómicas condicionadas o `db.batch([...])`; si hiciera falta una
  transacción interactiva se agrega un cliente `neon-serverless` (WebSocket).

## Seguridad de dependencias

`npm audit --omit=dev` (lo que corre en producción) → **0 vulnerabilidades**.

`npm audit` completo muestra avisos en herramientas de **desarrollo**
(`eslint-config-next` y `drizzle-kit`, por dependencias internas de terceros).
No se ejecutan en producción. **No ejecutes `npm audit fix --force`**: propone
bajar a versiones muy antiguas y rompería el proyecto; esos avisos se resuelven
cuando los autores publiquen sus actualizaciones.

## Qué NO está implementado todavía

- Autenticación real (el proveedor está por decidir) → `src/server/auth/session.ts`
- Catálogo (consultas, admin de productos), importación de inventario, imágenes (almacenamiento/CDN)
- Carrito y checkout reales
- Pagos (proveedor compatible con Costa Rica por elegir)
- Emails (Resend) y plantillas
- Cálculo de envíos (la primera versión será manual)
- Imágenes/productos reales (los bloques de la home son placeholders)

## Archivos `AGENTS.md` / `CLAUDE.md`

Los genera Next.js automáticamente (`next dev`) con instrucciones para
asistentes de IA. Se dejan commiteados para que no aparezcan como cambios
pendientes; no afectan al funcionamiento.
