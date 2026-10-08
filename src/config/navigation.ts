import type { Permission } from "@/domain/permissions";
import { routes } from "./routes";

export type NavItem = { label: string; href: string };
/** Ítem del panel: se muestra solo a quien tenga el permiso (la página y sus acciones igual lo vuelven a exigir en el servidor). */
export type AdminNavItem = NavItem & { permission?: Permission };

/** Navegación principal de la tienda. */
export const mainNav: readonly NavItem[] = [
  { label: "Tienda", href: routes.shop },
  { label: "Mi cuenta", href: routes.account },
];

/** Navegación del panel administrativo. */
export const adminNav: readonly AdminNavItem[] = [
  { label: "Panel", href: routes.admin },
  { label: "Productos", href: routes.adminProducts, permission: "products:read" },
  { label: "Pedidos", href: routes.adminOrders, permission: "orders:read" },
  { label: "Inventario", href: routes.adminInventory, permission: "inventory:read" },
  { label: "Clientes", href: routes.adminCustomers, permission: "customers:read" },
  { label: "Usuarios y roles", href: routes.adminUsers, permission: "users:read" },
  { label: "Impuestos", href: routes.adminTaxes, permission: "settings:read" },
  { label: "Envíos", href: routes.adminShipping, permission: "settings:read" },
];
