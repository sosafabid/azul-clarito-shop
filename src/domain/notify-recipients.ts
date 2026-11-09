/** Correo que recibe SIEMPRE el aviso de cada compra confirmada. */
export const ALWAYS_NOTIFY_EMAIL = "fsosa@azulclaritocr.com";

/** [correo fijo, ...los de la variable de entorno separados por coma], sin repetidos y solo direcciones con forma de correo. */
export function parseNotifyRecipients(extra: string | undefined): string[] {
  const list = [ALWAYS_NOTIFY_EMAIL, ...(extra ?? "").split(/[,;\s]+/)]
    .map((value) => value.trim().toLowerCase())
    .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(value));
  return [...new Set(list)];
}
