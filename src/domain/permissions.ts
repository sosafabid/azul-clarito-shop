import type { UserRole } from "./roles";

/**
 * Mapa central de permisos (qué rol puede hacer qué).
 *
 * IMPORTANTE: esconder un botón en la UI NO es seguridad. La UI puede usar
 * `can()` para decidir qué mostrar, pero la autorización real SIEMPRE se
 * vuelve a comprobar en el servidor (ver `src/server/auth/guards.ts`).
 */
export const PERMISSIONS = {
  // ── Usuarios y roles (solo SUPER_ADMIN) ──
  "users:read": ["SUPER_ADMIN"],
  "users:manage-roles": ["SUPER_ADMIN"],
  "users:invite": ["SUPER_ADMIN"],

  // ── Catálogo ──
  "products:read": ["SUPER_ADMIN", "STAFF"],
  // Crear y editar productos, imágenes y variantes (sin costo, sin stock y sin publicar: ver abajo).
  "products:write": ["SUPER_ADMIN", "STAFF"],
  // Publicar, ocultar, archivar y restaurar: cambia lo que ve el público.
  "products:publish": ["SUPER_ADMIN"],
  // Eliminación DEFINITIVA de productos: solo SUPER_ADMIN (y solo sin historial de ventas).
  "products:delete": ["SUPER_ADMIN"],

  // ── Inventario ──
  "inventory:read": ["SUPER_ADMIN", "STAFF"],
  // Registrar ajustes de stock (el stock inicial y los cambios de stock). STAFF solo consulta.
  "inventory:write": ["SUPER_ADMIN"],

  // ── Pedidos (la pantalla de pedidos aún no existe; los permisos ya quedan definidos) ──
  "orders:read": ["SUPER_ADMIN", "STAFF"],
  // Preparar, empacar, cambiar estados operativos y registrar courier / tracking / fecha de envío.
  "orders:fulfill": ["SUPER_ADMIN", "STAFF"],
  // Datos personales mínimos para preparar y entregar (nombre, teléfono y dirección de entrega).
  "orders:customer-delivery-data": ["SUPER_ADMIN", "STAFF"],
  "orders:refund": ["SUPER_ADMIN"],

  // ── Clientas (directorio completo: correo, estado de la cuenta, etc.) ──
  "customers:read": ["SUPER_ADMIN"],

  // ── Información económica interna (costos, utilidad, márgenes, valor de inventario). NUNCA pública ──
  "costs:read": ["SUPER_ADMIN"],

  // ── Configuración que afecta lo que paga la clienta, pagos e integraciones ──
  "settings:read": ["SUPER_ADMIN"],
  "settings:write": ["SUPER_ADMIN"],
  "integrations:manage": ["SUPER_ADMIN"],

  // ── Auditoría ──
  "audit:read": ["SUPER_ADMIN"],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}

/**
 * Permisos de un rol, derivados de la matriz. Para ampliar a STAFF más adelante basta con
 * agregar "STAFF" a la línea del permiso en `PERMISSIONS`; para un rol nuevo, agregarlo al
 * tipo `UserRole` y a las líneas que correspondan. Ninguna otra parte del código compara roles.
 */
export function permissionsOf(role: UserRole): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((permission) => can(role, permission));
}
