/**
 * Reglas puras de los enlaces de verificación de correo y de restablecimiento de
 * contraseña (sin base de datos, cookies ni red).
 *
 * El token que viaja por correo es aleatorio (256 bits). En la base de datos solo
 * se guarda su HASH, expira y se puede usar UNA sola vez.
 */
export const AUTH_TOKEN_PURPOSES = ["EMAIL_VERIFICATION", "PASSWORD_RESET"] as const;
export type AuthTokenPurpose = (typeof AUTH_TOKEN_PURPOSES)[number];

/** Vigencia de cada tipo de enlace, en minutos. El de contraseña es corto a propósito. */
export const TOKEN_TTL_MINUTES: Record<AuthTokenPurpose, number> = {
  EMAIL_VERIFICATION: 24 * 60,
  PASSWORD_RESET: 60,
};

export function tokenExpiry(purpose: AuthTokenPurpose, now: Date = new Date()): Date {
  return new Date(now.getTime() + TOKEN_TTL_MINUTES[purpose] * 60 * 1000);
}

/** randomBytes(32) en base64url = 43 caracteres. Descarta basura antes de consultar la base. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export function isPlausibleToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

/**
 * Límites de frecuencia (anti-abuso). `max` solicitudes por `windowSeconds`.
 * Cada "bucket" se cuenta por separado y por clave (correo, cuenta o dirección IP).
 */
export type RateLimit = { max: number; windowSeconds: number };

export const RATE_LIMITS = {
  /** "Olvidé mi contraseña": por correo y por IP. */
  forgotByEmail: { max: 3, windowSeconds: 60 * 60 },
  forgotByIp: { max: 10, windowSeconds: 60 * 60 },
  /** Reenvío del correo de verificación: por correo, por IP y una pausa mínima entre envíos. */
  verifyResendByEmail: { max: 3, windowSeconds: 60 * 60 },
  verifyResendCooldown: { max: 1, windowSeconds: 60 },
  verifyResendByIp: { max: 10, windowSeconds: 60 * 60 },
  /** Intentos de usar enlaces (verificar / restablecer) desde una misma IP. */
  tokenUseByIp: { max: 30, windowSeconds: 15 * 60 },
} as const satisfies Record<string, RateLimit>;

/** Mensajes fijos: la respuesta es la misma exista o no la cuenta (no se puede averiguar qué correos están registrados). */
export const AUTH_MESSAGES = {
  forgotGeneric: "Si existe una cuenta asociada a este correo, recibirás un enlace para restablecer tu contraseña.",
  verifyResendGeneric: "Si existe una cuenta pendiente de verificación con ese correo, te enviamos un nuevo enlace.",
  invalidLink: "Este enlace ya no es válido o expiró.",
  tooMany: "Hiciste muchos intentos. Esperá unos minutos y probá de nuevo.",
} as const;

export type ResetPasswordInput = { token: string; newPassword: string; newPasswordConfirm: string };
