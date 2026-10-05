import "server-only";

/** Utilidades para leer formularios del panel (solo servidor). */
export function formToRecord(formData: FormData): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") record[key] = value;
  }
  return record;
}

/** Archivos realmente seleccionados (un input `file` vacío envía un archivo de 0 bytes). */
export function collectFiles(formData: FormData, name: string): File[] {
  return formData.getAll(name).filter((value): value is File => typeof value !== "string" && value.size > 0 && value.name !== "");
}

/**
 * Solo se permite volver a páginas de productos del panel (evita redirecciones
 * a otros sitios si alguien manipula el campo oculto).
 */
export function safeProductsReturn(path: string | undefined, fallback: string): string {
  if (path && /^\/admin\/products(\/[A-Za-z0-9-]+)?(\?[A-Za-z0-9=&%_.-]*)?$/.test(path)) return path;
  return fallback;
}
