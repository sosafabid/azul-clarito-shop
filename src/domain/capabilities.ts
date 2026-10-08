import { can } from "./permissions";
import type { UserRole } from "./roles";

/**
 * Qué puede ver o hacer una persona del equipo DENTRO de las pantallas de catálogo.
 * Se deriva de la matriz de permisos (no hay comparaciones de roles sueltas).
 *
 * Ojo: estas banderas solo deciden qué se DIBUJA. Cada Server Action vuelve a calcularlas
 * en el servidor a partir de la sesión y aplica la restricción de verdad.
 */
export type CatalogCapabilities = {
  /** Ver y editar costos, utilidad, márgenes y valor del inventario. */
  costs: boolean;
  /** Registrar stock inicial y ajustes de stock. */
  stock: boolean;
  /** Publicar, ocultar, archivar y restaurar productos. */
  publish: boolean;
  /** Eliminar definitivamente. */
  delete: boolean;
};

export function catalogCapabilities(role: UserRole): CatalogCapabilities {
  return {
    costs: can(role, "costs:read"),
    stock: can(role, "inventory:write"),
    publish: can(role, "products:publish"),
    delete: can(role, "products:delete"),
  };
}
