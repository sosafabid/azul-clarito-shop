import { routes } from "./routes";

export type NavItem = { label: string; href: string };

/** Navegación principal de la tienda. */
export const mainNav: readonly NavItem[] = [
  { label: "Tienda", href: routes.shop },
  { label: "Mi cuenta", href: routes.account },
];

/** Navegación del panel administrativo. */
export const adminNav: readonly NavItem[] = [
  { label: "Panel", href: routes.admin },
  { label: "Productos", href: routes.adminProducts },
  { label: "Pedidos", href: routes.adminOrders },
  { label: "Inventario", href: routes.adminInventory },
  { label: "Clientes", href: routes.adminCustomers },
  { label: "Impuestos", href: routes.adminTaxes },
  { label: "Envíos", href: routes.adminShipping },
];
