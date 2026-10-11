import { CR_PROVINCES, STORE_COUNTRY } from "./shipping";
import { crStateCode } from "./tilopay";

/**
 * Datos que la clienta escribe para comprar (invitada o con cuenta) y su validación. Reglas puras.
 * Nunca incluyen montos: precios, impuestos, envío y total los calcula el servidor.
 * El código postal y el teléfono son OBLIGATORIOS porque la pasarela los exige.
 */
export type CheckoutFormInput = {
  name: string;
  email: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
  line1: string;
  line2: string;
  notes: string;
  acceptTerms: boolean;
};

export type CheckoutFormErrors = Partial<Record<keyof CheckoutFormInput, string>>;

export type ParsedCheckoutForm = { ok: true; value: CheckoutFormInput & { stateCode: string; firstName: string; lastName: string } } | { ok: false; errors: CheckoutFormErrors };

const clean = (value: FormDataEntryValue | null, max: number): string =>
  String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@.]{2,}$/;

/** "María José Soto Rojas" → nombre "María José", apellido "Soto Rojas". Con una sola palabra, el apellido repite lo mínimo exigido. */
export function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] ?? "", lastName: parts[0] ?? "" };
  const firstCount = parts.length >= 4 ? 2 : 1;
  return { firstName: parts.slice(0, firstCount).join(" "), lastName: parts.slice(firstCount).join(" ") };
}

export function parseCheckoutForm(formData: FormData): ParsedCheckoutForm {
  const input: CheckoutFormInput = {
    name: clean(formData.get("name"), 120),
    email: clean(formData.get("email"), 254).toLowerCase(),
    phone: clean(formData.get("phone"), 20),
    province: clean(formData.get("province"), 40),
    city: clean(formData.get("city"), 80),
    district: clean(formData.get("district"), 80),
    postalCode: clean(formData.get("postalCode"), 10),
    line1: clean(formData.get("line1"), 200),
    line2: clean(formData.get("line2"), 200),
    notes: clean(formData.get("notes"), 500),
    acceptTerms: formData.get("acceptTerms") === "on" || formData.get("acceptTerms") === "true",
  };
  const errors: CheckoutFormErrors = {};
  if (input.name.length < 2 || !input.name.includes(" ")) errors.name = "Escribí tu nombre y apellido.";
  if (!EMAIL.test(input.email)) errors.email = "Revisá tu correo electrónico.";
  if (!/^\+?[\d\s-]{7,20}$/.test(input.phone) || input.phone.replace(/\D/g, "").length < 8) errors.phone = "Escribí un teléfono válido (al menos 8 dígitos).";
  if (!(CR_PROVINCES as readonly string[]).includes(input.province) || crStateCode(input.province) === null) errors.province = "Elegí una provincia de Costa Rica.";
  if (input.city.length < 2) errors.city = "Escribí tu cantón.";
  if (input.district.length < 2) errors.district = "Escribí tu distrito.";
  if (!/^\d{5}$/.test(input.postalCode)) errors.postalCode = "El código postal tiene 5 dígitos.";
  if (input.line1.length < 5) errors.line1 = "Escribí la dirección exacta (al menos 5 caracteres).";
  if (!input.acceptTerms) errors.acceptTerms = "Tenés que aceptar los términos y la política de privacidad.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const stateCode = crStateCode(input.province) as string;
  return { ok: true, value: { ...input, stateCode, ...splitName(input.name) } };
}

export const CHECKOUT_COUNTRY = STORE_COUNTRY;
