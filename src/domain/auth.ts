/**
 * Reglas puras de autenticación (sin base de datos ni cookies).
 */
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
export const SESSION_TTL_DAYS = 7;
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 200;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isPlausibleEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

/** Política mínima de contraseña para el equipo. Devuelve un mensaje, o `null` si es válida. */
export function validatePassword(password: string, email?: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) return `La contraseña es demasiado larga (máximo ${MAX_PASSWORD_LENGTH}).`;
  if (/^(.)\1+$/.test(password)) return "La contraseña no puede ser un solo carácter repetido.";
  if (email && password.toLowerCase() === normalizeEmail(email)) return "La contraseña no puede ser igual al correo.";
  return null;
}

export function isLocked(lockedUntil: Date | null, now: Date = new Date()): boolean {
  return lockedUntil !== null && lockedUntil.getTime() > now.getTime();
}

export function sessionExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}
