import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Pruebas de ARQUITECTURA / SEGURIDAD: no verifican comportamiento, sino que el
 * código mantenga las fronteras que protegen la información privada.
 */
const SRC = join(process.cwd(), "src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
const rel = (path: string) => relative(process.cwd(), path).replaceAll("\\", "/");
const read = (path: string) => readFileSync(path, "utf8");
/** Quita comentarios: las pruebas deben mirar el CÓDIGO, no las explicaciones (que mencionan "costo"). */
const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const importsOf = (source: string) => [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);

const all = walk(SRC).filter((p) => /\.(ts|tsx)$/.test(p) && !p.endsWith(".test.ts"));

describe("frontera pública / privada", () => {
  // Código que ve cualquier visitante: páginas de la tienda y sus componentes.
  const publicFiles = all.filter((p) => {
    const r = rel(p);
    return (
      r.startsWith("src/app/(store)/") ||
      r.startsWith("src/components/shop/") ||
      r.startsWith("src/components/ui/") ||
      r.startsWith("src/components/layout/") ||
      r.startsWith("src/components/home/")
    );
  });

  const FORBIDDEN = [
    "@/server/services/catalog/admin",
    "@/server/services/catalog/admin-images",
    "@/server/services/catalog/admin-variants",
    "@/server/services/catalog/taxonomy",
    "@/server/services/settings",
    "@/server/services/inventory",
    "@/server/services/images",
    // acciones del panel (las de sesión y cuenta de clientas SÍ las usa la tienda):
    "@/server/actions/products",
    "@/server/actions/product-images",
    "@/server/actions/product-variants",
    "@/components/admin",
    "@/db/schema", // las páginas públicas no tocan tablas directamente
  ];

  it("hay archivos públicos que revisar", () => {
    expect(publicFiles.length).toBeGreaterThan(10);
  });

  it("el código público no importa módulos de administración ni el schema", () => {
    const offenders = publicFiles.flatMap((file) =>
      importsOf(read(file))
        .filter((imp) => FORBIDDEN.some((bad) => imp === bad || imp.startsWith(`${bad}/`)))
        .map((imp) => `${rel(file)} → ${imp}`),
    );
    expect(offenders).toEqual([]);
  });

  it("las consultas públicas del catálogo nunca mencionan el costo", () => {
    const queries = stripComments(read(join(SRC, "server/services/catalog/queries.ts")));
    expect(queries).not.toMatch(/cost/i);
  });

  it("los tipos públicos no tienen campos de costo ni cantidades internas", () => {
    const types = stripComments(read(join(SRC, "types/catalog.ts")));
    expect(types).not.toMatch(/\bcost\b/);
    expect(types).not.toMatch(/reservedStock|soldStock|availableStock/);
  });
});

describe("autorización en el servidor", () => {
  it("cada Server Action exige sesión/permiso ANTES de tocar la base de datos", () => {
    // login / registro / logout y el carrito son públicos por naturaleza (se prueban aparte, abajo).
    const files = all.filter((p) => rel(p).startsWith("src/server/actions/") && !rel(p).endsWith("/actions/auth.ts") && !rel(p).endsWith("/actions/cart.ts"));
    expect(files.length).toBeGreaterThanOrEqual(4);

    for (const file of files) {
      const source = read(file);
      expect(source.trimStart().startsWith('"use server"')).toBe(true);
      const chunks = source.split(/export async function /).slice(1);
      expect(chunks.length).toBeGreaterThan(0);
      const isAccount = rel(file).endsWith("/actions/account.ts");
      for (const chunk of chunks) {
        const name = chunk.slice(0, chunk.indexOf("("));
        // Panel: permiso concreto. Cuenta de clientas: sesión iniciada (opera solo sobre SU cuenta).
        const guardCall = isAccount ? "await requireUser(" : "await requirePermission(";
        const guard = chunk.indexOf(guardCall);
        const db = chunk.search(/getDb\(|isDatabaseConfigured\(/);
        expect(guard, `${rel(file)}: ${name} no llama a ${guardCall}`).toBeGreaterThanOrEqual(0);
        expect(guard, `${rel(file)}: ${name} toca la base de datos antes del guard`).toBeLessThan(db === -1 ? Infinity : db);
      }
    }
  });

  it("toda página del panel que lee la base de datos exige permiso", () => {
    const pages = all.filter((p) => rel(p).startsWith("src/app/admin/") && p.endsWith("page.tsx"));
    const withDb = pages.filter((p) => /from "@\/db"/.test(read(p)));
    expect(withDb.length).toBeGreaterThanOrEqual(4);
    for (const page of withDb) {
      expect(read(page), `${rel(page)} lee la BD sin requirePermission`).toMatch(/await requirePermission\(/);
    }
  });

  it("el layout del panel exige ser parte del equipo", () => {
    expect(read(join(SRC, "app/admin/(panel)/layout.tsx"))).toMatch(/await requireStaff\(\)/);
  });

  it("no hay rutas API (route handlers) que modifiquen datos", () => {
    const handlers = all.filter((p) => /\/route\.ts$/.test(rel(p)));
    expect(handlers.map(rel)).toEqual([]);
  });
});

describe("autenticación real", () => {
  it("no existe ningún atajo de desarrollo que salte el login", () => {
    const offenders = all.filter((p) => /DEV_ADMIN_PREVIEW|devAdminPreview|DEV_PREVIEW/.test(read(p))).map(rel);
    expect(offenders).toEqual([]);
  });

  it("el login (equipo y clientas) no acepta roles desde el formulario y protege contra fuerza bruta", () => {
    const actions = stripComments(read(join(SRC, "server/actions/auth.ts")));
    expect(actions).not.toMatch(/formData\.get\(["']role["']\)/);
    const login = stripComments(read(join(SRC, "server/services/auth/login.ts")));
    expect(login).toMatch(/burnPasswordCheck/); // tiempo equilibrado cuando el correo no existe
    expect(login).toMatch(/MAX_FAILED_LOGIN_ATTEMPTS/); // bloqueo por intentos
    expect(actions).toMatch(/staffOnly: true/); // el panel solo admite al equipo
  });

  it("la cookie de sesión es HttpOnly, SameSite y Secure en producción", () => {
    const source = read(join(SRC, "server/auth/session.ts"));
    expect(source).toMatch(/httpOnly: true/);
    expect(source).toMatch(/sameSite: "lax"/);
    expect(source).toMatch(/secure: process\.env\.NODE_ENV === "production"/);
  });

  it("el rol se lee de la base de datos en cada petición, no de la cookie", () => {
    const source = stripComments(read(join(SRC, "server/auth/session.ts")));
    expect(source).toMatch(/users\.role/);
    expect(source).not.toMatch(/cookies\(\)\)\.get\([^)]*\)\?\.value\s*as\s*UserRole/);
  });

  it("sin sesión, los guards redirigen al login; con sesión sin permiso → 404", () => {
    const source = stripComments(read(join(SRC, "server/auth/guards.ts")));
    expect(source).toMatch(/redirect\(routes\.adminLogin\)/);
    expect(source).toMatch(/notFound\(\)/);
  });

  it("la eliminación definitiva (producto y variante) exige el permiso products:delete", () => {
    expect(read(join(SRC, "server/actions/products.ts"))).toMatch(/deleteProductAction[\s\S]*?requirePermission\("products:delete"\)/);
    expect(read(join(SRC, "server/actions/product-variants.ts"))).toMatch(/deleteVariantAction[\s\S]*?requirePermission\("products:delete"\)/);
  });
});

describe("cuentas de clientas y consentimiento", () => {
  it("el registro SIEMPRE crea una cuenta CUSTOMER (nunca recibe el rol del formulario)", () => {
    const service = stripComments(read(join(SRC, "server/services/accounts.ts")));
    expect(service).toMatch(/role: "CUSTOMER"/);
    expect(service).not.toMatch(/data\.role|input\.role/);
    const form = stripComments(read(join(SRC, "domain/customer-form.ts")));
    expect(form).not.toMatch(/\brole\b/);
  });

  it("los consentimientos obligatorios se exigen en el servidor, no solo en el navegador", () => {
    const form = stripComments(read(join(SRC, "domain/customer-form.ts")));
    expect(form).toMatch(/acceptTerms/);
    expect(form).toMatch(/acceptPrivacy/);
    // y el servicio guarda cada aceptación como evento con la versión del texto legal
    const service = stripComments(read(join(SRC, "server/services/accounts.ts")));
    expect(service).toMatch(/type: "TERMS"/);
    expect(service).toMatch(/type: "PRIVACY"/);
  });

  it("las acciones de cuenta operan SOLO sobre la sesión: ninguna recibe un id de usuario del formulario", () => {
    const source = stripComments(read(join(SRC, "server/actions/account.ts")));
    expect(source).not.toMatch(/formData\.get\(["'](userId|id|user_id)["']\)/);
    expect(source).toMatch(/session\.userId/);
  });

  it("el código público nunca usa los guards del panel", () => {
    const publicFiles = all.filter((p) =>
      ["src/app/(store)/", "src/components/shop/", "src/components/ui/", "src/components/layout/", "src/components/home/", "src/components/account/"].some((prefix) => rel(p).startsWith(prefix)),
    );
    const publicWithGuards = publicFiles.filter((f) => /requirePermission|requireStaff|requireRole/.test(stripComments(read(f))));
    expect(publicWithGuards.map(rel)).toEqual([]);
  });

  it("la auditoría de la cuenta no guarda datos personales (solo qué campos cambiaron)", () => {
    const service = stripComments(read(join(SRC, "server/services/accounts.ts")));
    expect(service).toMatch(/fields/);
    expect(service).not.toMatch(/metadata:\s*\{[^}]*(email|phone|name)\s*:/);
  });
});

describe("carrito", () => {
  const cartServices = () => all.filter((p) => rel(p).startsWith("src/server/services/cart/"));

  it("las acciones del carrito aceptan SOLO ids y cantidades: nunca precio, costo, usuario ni carrito", () => {
    const source = stripComments(read(join(SRC, "server/actions/cart.ts")));
    expect(source).not.toMatch(/formData\.get\(["'](price|unitPrice|cost|total|subtotal|userId|cartId|ownerId)["']\)/);
    // la dueña del carrito se deduce de la sesión o de la cookie de invitada, no del formulario
    expect(source).toMatch(/getOwnerForWrite\(/);
    expect(source).toMatch(/getCartOwner\(/);
    expect(source).not.toMatch(/\bprice\b|\bcost\b/i);
  });

  it("el servicio del carrito nunca lee ni calcula costos, márgenes o utilidades", () => {
    const files = cartServices();
    expect(files.length).toBeGreaterThanOrEqual(4);
    for (const file of files) expect(stripComments(read(file)), rel(file)).not.toMatch(/\bcost\b|margin|profit|utilidad/i);
  });

  it("las tablas del carrito no guardan precios ni costos (solo ids y cantidades)", () => {
    expect(stripComments(read(join(SRC, "db/schema/carts.ts")))).not.toMatch(/price|cost/i);
  });

  it("modificar o eliminar una línea siempre verifica que sea del carrito de quien lo pide", () => {
    const source = stripComments(read(join(SRC, "server/services/cart/cart.ts")));
    expect(source).toMatch(/async function findOwnedLine[\s\S]*?ownerCondition\(owner\)/);
    // setQuantity y removeLine parten de findOwnedLine
    expect(source).toMatch(/async function setQuantity[\s\S]*?findOwnedLine\(/);
    expect(source).toMatch(/async function removeLine[\s\S]*?findOwnedLine\(/);
  });

  it("el precio y la disponibilidad se leen de la base en el servidor antes de agregar o cambiar cantidad", () => {
    const source = stripComments(read(join(SRC, "server/services/cart/cart.ts")));
    expect(source).toMatch(/async function addItem[\s\S]*?resolvePurchasable\(/);
    expect(source).toMatch(/async function setQuantity[\s\S]*?resolvePurchasable\(/);
    expect(source).toMatch(/status !== "ACTIVE"/); // solo productos activos
  });

  it("la cookie de invitada es HttpOnly + SameSite y contiene solo un token aleatorio", () => {
    const source = read(join(SRC, "server/services/cart/identity.ts"));
    expect(source).toMatch(/httpOnly: true/);
    expect(source).toMatch(/sameSite: "lax"/);
    expect(source).toMatch(/secure: process\.env\.NODE_ENV === "production"/);
    expect(source).toMatch(/randomBytes\(32\)/);
  });

  it("todo inicio de sesión (equipo, clientas, registro) fusiona el carrito de invitada", () => {
    const callers = all.filter((p) => /startSession\(/.test(stripComments(read(p))) && !rel(p).includes("server/auth/"));
    expect(callers.length).toBeGreaterThanOrEqual(1);
    for (const file of callers) expect(stripComments(read(file)), rel(file)).toMatch(/mergeCartOnLogin\(/);
  });

  it("agregar al carrito NO reserva stock: el servicio nunca escribe en inventory", () => {
    for (const file of cartServices()) {
      expect(stripComments(read(file)), rel(file)).not.toMatch(/db\.(update|insert|delete)\(\s*inventory\b/);
    }
  });
});

describe("checkout, impuestos y envíos", () => {
  const publicFiles = () =>
    all.filter((p) => ["src/app/(store)/", "src/components/shop/", "src/components/ui/", "src/components/layout/", "src/components/home/", "src/components/account/", "src/components/cart/"].some((prefix) => rel(p).startsWith(prefix)));

  it("el checkout solo lee de la URL el destino y el método: nunca montos", () => {
    const source = stripComments(read(join(SRC, "app/(store)/checkout/page.tsx")));
    const declared = /searchParams: Promise<\{([^}]*)\}>/.exec(source)?.[1] ?? "";
    const names = [...declared.matchAll(/(\w+)\??:/g)].map((m) => m[1]).sort();
    expect(names).toEqual(["ciudad", "cp", "pais", "provincia"]); // pais solo para RECHAZAR cualquier valor distinto de CR
    expect(source).toMatch(/calculateCheckoutTotals\(/);
    expect(source).not.toMatch(/name="(total|subtotal|impuesto|tax|precio|price|envioPrecio|shippingCost)"/i);
  });

  it("el motor de totales no recibe ningún monto calculado: solo precios leídos, tasas y tarifas", () => {
    const source = stripComments(read(join(SRC, "domain/checkout.ts")));
    const signature = source.slice(source.indexOf("export function computeTotals(input: {"), source.indexOf("}): CheckoutTotals {"));
    expect(signature.length).toBeGreaterThan(50);
    expect(signature).not.toMatch(/\b(total|subtotal|taxAmount|shippingAmount|shippingCost|tax\w*Total)\b/);
  });

  it("el servicio de totales lee precios, tasa y tarifas de la base de datos (no de parámetros)", () => {
    const source = stripComments(read(join(SRC, "server/services/checkout/totals.ts")));
    expect(source).toMatch(/getCartView\(/); // precios y stock revalidados
    expect(source).toMatch(/loadTaxConfig\(/);
    expect(source).toMatch(/loadShippingMethods\(/);
    expect(source).not.toMatch(/input\.(total|price|tax|shippingCost|amount)/);
  });

  it("checkout, impuestos y envíos nunca tocan costos, márgenes ni utilidades", () => {
    const files = ["domain/checkout.ts", "domain/tax.ts", "domain/shipping.ts", "domain/settings-form.ts", "server/services/checkout/totals.ts", "server/services/settings/tax.ts", "server/services/settings/shipping.ts", "app/(store)/checkout/page.tsx"];
    for (const file of files) expect(stripComments(read(join(SRC, file))), file).not.toMatch(/\bcost\b|margin|profit|utilidad/i);
  });

  it("todas las acciones de impuestos y envíos exigen settings:write (solo SUPER_ADMIN)", () => {
    const source = read(join(SRC, "server/actions/settings.ts"));
    const chunks = source.split(/export async function /).slice(1);
    expect(chunks.length).toBeGreaterThanOrEqual(7);
    for (const chunk of chunks) expect(chunk.slice(0, 400), chunk.slice(0, 40)).toMatch(/requirePermission\("settings:write"\)/);
  });

  it("ninguna tasa ni tarifa está escrita en el código público (todo sale de la configuración)", () => {
    for (const file of publicFiles()) {
      const code = stripComments(read(file));
      expect(code, rel(file)).not.toMatch(/\bIVA\b|\b0\.13\b|\b13 ?%|\b1300\b/);
      expect(code, rel(file)).not.toMatch(/₡\s?\d/);
    }
  });

  it("las migraciones no precargan impuestos; solo la configuración inicial del envío nacional, de forma condicional", () => {
    const dir = join(process.cwd(), "drizzle");
    const sqlFiles = walk(dir).filter((f) => f.endsWith(".sql"));
    for (const file of sqlFiles) expect(read(file), rel(file)).not.toMatch(/INSERT\s+INTO\s+"?(tax_rates|tax_rules)"?/i);
    // Métodos: solo se crean si no existe ninguno.
    const methodInserts = sqlFiles.filter((f) => /INSERT\s+INTO\s+"?shipping_methods"?/i.test(read(f)));
    expect(methodInserts.length).toBeGreaterThanOrEqual(1);
    for (const file of methodInserts) expect(read(file), rel(file)).toMatch(/WHERE NOT EXISTS \(SELECT 1 FROM "shipping_methods"\)/);
    // Tarifa inicial: UNA sola migración, solo si el método no tiene ninguna tarifa.
    const rateInserts = sqlFiles.filter((f) => /INSERT\s+INTO\s+"?shipping_rates"?/i.test(read(f)));
    expect(rateInserts.length).toBe(1);
    expect(read(rateInserts[0])).toMatch(/NOT EXISTS \(SELECT 1 FROM "shipping_rates" r WHERE r\."method_id" = m\."id"\)/);
    expect(all.filter((p) => /seed/i.test(rel(p)))).toEqual([]);
  });

  it("la orden tiene dónde congelar el cálculo (pricing_snapshot) y el CHECK de totales sigue vigente", () => {
    const orders = read(join(SRC, "db/schema/orders.ts"));
    expect(orders).toMatch(/pricing_snapshot/);
    expect(orders).toMatch(/orders_total_matches_parts/);
  });
});

describe("envíos solo Costa Rica y logística manual", () => {
  const publicFiles = () =>
    all.filter((p) => ["src/app/(store)/", "src/components/shop/", "src/components/ui/", "src/components/layout/", "src/components/home/", "src/components/account/", "src/components/cart/"].some((prefix) => rel(p).startsWith(prefix)));

  it("el checkout no tiene selector de países ni campo de país editable", () => {
    const source = stripComments(read(join(SRC, "app/(store)/checkout/page.tsx")));
    expect(source).not.toMatch(/name="pais"|COUNTRY_CODES|countryName|list="paises"|<datalist/);
    expect(source).toMatch(/STORE_COUNTRY_NAME/);
    expect(source).toMatch(/COUNTRY_ONLY_MESSAGE/);
  });

  it("el país se valida en el BACKEND: parseDestination y el motor rechazan todo lo que no sea Costa Rica", () => {
    expect(stripComments(read(join(SRC, "domain/shipping.ts")))).toMatch(/countryRejected: true/);
    expect(stripComments(read(join(SRC, "domain/checkout.ts")))).toMatch(/unsupported_country/);
    expect(stripComments(read(join(SRC, "domain/settings-form.ts")))).toMatch(/countryCode: STORE_COUNTRY/);
  });

  it("no existe ninguna lista de países ni código de envíos internacionales", () => {
    for (const file of all.filter((p) => !/\.test\.ts$/.test(p))) expect(stripComments(read(file)), rel(file)).not.toMatch(/COUNTRY_CODES|isCountryCode|countryName\(/);
  });

  it("el panel de tarifas ya no ofrece un campo de país", () => {
    expect(stripComments(read(join(SRC, "app/admin/(panel)/shipping/page.tsx")))).not.toMatch(/name="country"|list="paises"/);
  });

  it("no hay integración con Correos ni con ningún courier (todo manual)", () => {
    for (const file of all.filter((p) => !/\.test\.ts$/.test(p))) {
      expect(stripComments(read(file)), rel(file)).not.toMatch(/correos\.go\.cr|api\.correos|dhl|fedex|ups\.com|trackingApi|createLabel|generateLabel/i);
    }
  });

  it("el cliente no ve nombres de couriers: la interfaz pública habla de 'Envío nacional' manual", () => {
    for (const file of publicFiles()) expect(stripComments(read(file)), rel(file)).not.toMatch(/\bcorreos de costa rica\b|\bcourier\b/i);
  });

  it("el flujo manual de la orden está previsto: estados, tracking, fecha de envío y notas internas", () => {
    expect(read(join(SRC, "domain/order-status.ts"))).toMatch(/"PREPARING"[\s\S]*"PACKED"[\s\S]*"SHIPPED"[\s\S]*"DELIVERED"/);
    const orders = read(join(SRC, "db/schema/orders.ts"));
    for (const column of ["carrier", "tracking_number", "tracking_url", "shipped_at", "delivered_at", "internal_notes"]) expect(orders).toContain(column);
  });
});

describe("envío nacional editable desde el Admin", () => {
  const sources = () => all.filter((p) => !/\.test\.ts$/.test(p));

  it("la tarifa NO está escrita en el código: ni 4000 ni 3500 ni 4500 en ningún archivo de la aplicación", () => {
    for (const file of sources()) expect(stripComments(read(file)), rel(file)).not.toMatch(/\b(4000|3500|4500)\b|\b(4|3)\.500\b|\b4\.000\b|shipping\s*=\s*\d/);
  });

  it("el checkout toma la tarifa de la base de datos (tarifas activas), nunca de una constante", () => {
    const source = stripComments(read(join(SRC, "server/services/checkout/totals.ts")));
    expect(source).toMatch(/from\(shippingRates\)/);
    expect(source).toMatch(/eq\(shippingRates\.isActive, true\)/);
    expect(source).toMatch(/eq\(shippingMethods\.isActive, true\)/);
  });

  it("el formulario simple no acepta id de método, id de tarifa, país ni montos calculados del navegador", () => {
    const action = stripComments(read(join(SRC, "server/actions/settings.ts")));
    const chunk = action.slice(action.indexOf("export async function saveNationalShippingAction"), action.indexOf("export async function saveShippingMethodAction"));
    expect(chunk).toMatch(/requirePermission\("settings:write"\)/);
    expect(chunk).not.toMatch(/methodId|rateId|country|pais|total|subtotal/i);
    const service = stripComments(read(join(SRC, "server/services/settings/shipping.ts")));
    expect(service).toMatch(/export async function saveNationalShipping\(db: Database, input: ParsedNationalShipping, actor: AuditActor\)/);
  });

  it("cada cambio económico del envío deja auditoría (crear, modificar, tarifa, activar, desactivar)", () => {
    const service = read(join(SRC, "server/services/settings/shipping.ts"));
    for (const action of ["shipping.method_created", "shipping.method_updated", "shipping.method_activated", "shipping.method_deactivated", "shipping.rate_created", "shipping.rate_changed"]) {
      expect(service, action).toContain(action);
    }
    expect(service).toMatch(/changesOf\(/); // guarda antes → después
  });

  it("el costo real del envío es interno: solo existe en el schema de orders, nunca en código público ni en el checkout", () => {
    const mentions = sources().filter((p) => /shippingActualCost|shipping_actual_cost/.test(read(p))).map(rel);
    expect(mentions).toEqual(["src/db/schema/orders.ts"]);
  });

  it("si el método está desactivado, el checkout lo dice y no deja continuar", () => {
    const page = read(join(SRC, "app/(store)/checkout/page.tsx"));
    expect(page).toMatch(/No hay un método de envío disponible/);
    expect(page).toMatch(/totals\.canProceed/);
    const engine = stripComments(read(join(SRC, "domain/checkout.ts")));
    expect(engine).toMatch(/canProceed: blockers\.length === 0 && total !== null/);
  });
});

describe("catálogo real: sin datos de ejemplo en el código", () => {
  it("ningún archivo de la aplicación contiene productos de prueba hardcodeados", () => {
    const offenders = all.filter((p) => /Producto de prueba|NO VENDER|DEV-TEST/.test(read(p))).map(rel);
    expect(offenders).toEqual([]);
  });

  it("no hay scripts que creen productos (seed)", () => {
    const scripts = walk(join(process.cwd(), "scripts")).map(rel);
    expect(scripts.filter((s) => /seed/i.test(s))).toEqual([]);
  });
});

describe("secretos", () => {
  it("ningún archivo de código contiene cadenas de conexión ni claves", () => {
    const patterns = [/postgres(ql)?:\/\/[^\s"'`]+:[^\s"'`@]+@/, /sk_(live|test)_[A-Za-z0-9]+/, /re_[A-Za-z0-9]{20,}/];
    const offenders = [...all, ...walk(join(process.cwd(), "scripts"))].flatMap((file) =>
      patterns.filter((re) => re.test(read(file))).map(() => rel(file)),
    );
    expect(offenders).toEqual([]);
  });
});
