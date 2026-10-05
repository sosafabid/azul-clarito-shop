/** Rutas internas en un solo lugar (evita strings sueltos y enlaces rotos). */
export const routes = {
  home: "/",
  shop: "/shop",
  product: (slug: string) => `/shop/${encodeURIComponent(slug)}`,
  cart: "/cart",
  checkout: "/checkout",
  account: "/account",
  accountOrders: "/account/orders",
  admin: "/admin",
  adminLogin: "/admin/login",
  adminProducts: "/admin/products",
  adminProductNew: "/admin/products/new",
  adminProduct: (id: string) => `/admin/products/${encodeURIComponent(id)}`,
  adminProductDelete: (id: string) => `/admin/products/${encodeURIComponent(id)}/eliminar`,
  adminOrders: "/admin/orders",
  adminInventory: "/admin/inventory",
  adminCustomers: "/admin/customers",
} as const;

/** Páginas reales del sitio principal (azulclaritocr.com), para enlaces cruzados. */
export const mainSiteRoutes = {
  music: "/musica.html",
  ep: "/ep.html",
  books: "/libros.html",
} as const;
