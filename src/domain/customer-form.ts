import { MAX_PASSWORD_LENGTH, isPlausibleEmail, normalizeEmail, validatePassword } from "./auth";

export type FormInput = Partial<Record<string, string>>;
type Errors = Record<string, string>;

const NAME_MIN = 2;
const NAME_MAX = 100;
const PHONE_PATTERN = /^[+0-9()\s-]{7,20}$/;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

const checked = (input: FormInput, key: string) => input[key] === "on" || input[key] === "true";

/** Nombre: sin espacios sobrantes ni caracteres de control. Devuelve un mensaje si es inválido. */
export function parseName(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw.replace(/\s+/g, " ").trim();
  if (value.length < NAME_MIN || value.length > NAME_MAX) return { ok: false, error: `El nombre debe tener entre ${NAME_MIN} y ${NAME_MAX} caracteres.` };
  if (CONTROL_CHARS.test(value)) return { ok: false, error: "El nombre contiene caracteres no válidos." };
  return { ok: true, value };
}

/** Teléfono opcional: vacío = sin teléfono. */
export function parsePhone(raw: string): { ok: true; value: string | null } | { ok: false; error: string } {
  const value = raw.trim();
  if (value === "") return { ok: true, value: null };
  if (!PHONE_PATTERN.test(value) || value.replace(/\D/g, "").length < 7) {
    return { ok: false, error: "Ingresá un teléfono válido (solo números, espacios, + y guiones)." };
  }
  return { ok: true, value };
}

export type ParsedRegistration = {
  name: string;
  email: string;
  phone: string | null;
  password: string;
  /** Consentimiento de comunicaciones comerciales (opcional; por defecto NO). */
  marketing: boolean;
};

export type RegistrationResult = { ok: true; data: ParsedRegistration } | { ok: false; errors: Errors };

/**
 * Validación del registro. Los dos consentimientos obligatorios (términos y
 * tratamiento de datos) se exigen AQUÍ, en el servidor: marcar la casilla en el
 * navegador no basta.
 */
export function parseRegistrationForm(input: FormInput): RegistrationResult {
  const errors: Errors = {};

  const name = parseName(input.name ?? "");
  if (!name.ok) errors.name = name.error;

  const email = normalizeEmail(input.email ?? "");
  if (!isPlausibleEmail(email)) errors.email = "Ingresá un correo válido.";

  const phone = parsePhone(input.phone ?? "");
  if (!phone.ok) errors.phone = phone.error;

  const password = input.password ?? "";
  const passwordProblem = validatePassword(password, email);
  if (passwordProblem) errors.password = passwordProblem;
  else if (password !== (input.passwordConfirm ?? "")) errors.passwordConfirm = "Las contraseñas no coinciden.";

  if (!checked(input, "acceptTerms")) errors.acceptTerms = "Para crear la cuenta tenés que aceptar los Términos y condiciones.";
  if (!checked(input, "acceptPrivacy")) errors.acceptPrivacy = "Para crear la cuenta tenés que autorizar el tratamiento de tus datos personales.";

  if (Object.keys(errors).length > 0 || !name.ok || !phone.ok) return { ok: false, errors };
  return { ok: true, data: { name: name.value, email, phone: phone.value, password, marketing: checked(input, "marketing") } };
}

export type ProfileResult = { ok: true; data: { name: string; phone: string | null } } | { ok: false; errors: Errors };

export function parseProfileForm(input: FormInput): ProfileResult {
  const errors: Errors = {};
  const name = parseName(input.name ?? "");
  if (!name.ok) errors.name = name.error;
  const phone = parsePhone(input.phone ?? "");
  if (!phone.ok) errors.phone = phone.error;
  if (!name.ok || !phone.ok) return { ok: false, errors };
  return { ok: true, data: { name: name.value, phone: phone.value } };
}

export type PasswordChangeResult = { ok: true; data: { current: string; next: string } } | { ok: false; errors: Errors };

export function parsePasswordChange(input: FormInput, email: string): PasswordChangeResult {
  const errors: Errors = {};
  const current = input.currentPassword ?? "";
  const next = input.newPassword ?? "";
  if (current === "" || current.length > MAX_PASSWORD_LENGTH) errors.currentPassword = "Ingresá tu contraseña actual.";
  const problem = validatePassword(next, email);
  if (problem) errors.newPassword = problem;
  else if (next === current) errors.newPassword = "La contraseña nueva tiene que ser distinta de la actual.";
  else if (next !== (input.newPasswordConfirm ?? "")) errors.newPasswordConfirm = "Las contraseñas no coinciden.";
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, data: { current, next } };
}
