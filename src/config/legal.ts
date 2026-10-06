import { siteConfig } from "./site";

/**
 * Datos y versiones de los textos legales (Términos y Política de Privacidad).
 *
 * VERSIONES: cada consentimiento guarda la versión del texto que la persona vio.
 * Si cambiás el contenido de /terminos o /privacidad, cambiá la versión acá
 * (formato AAAA-MM-DD) para que las nuevas aceptaciones queden asociadas al texto nuevo.
 *
 * ⚠️ COMPLETAR: los datos del responsable (`controller`) están en `null` porque
 * dependen de quién sea legalmente el titular de la tienda (persona física o jurídica).
 * Mientras sean `null` las páginas legales no los muestran. Los textos son una BASE
 * que debe revisar una persona abogada antes del lanzamiento.
 */
export const legalConfig = {
  /**
   * Pasá a `true` SOLO cuando una persona abogada haya revisado y aprobado los textos de
   * /terminos y /privacidad. Mientras sea `false`: las páginas muestran un aviso de
   * "texto provisional" y llevan `noindex`.
   */
  reviewed: false as boolean,
  termsVersion: "2026-10-05",
  privacyVersion: "2026-10-05",
  controller: {
    /** Nombre o razón social del responsable de la base de datos. */
    name: null as string | null,
    /** Cédula física o jurídica. */
    idNumber: null as string | null,
    /** Dirección física para ejercer derechos. */
    address: null as string | null,
  },
  contactEmail: siteConfig.contact.email,
  lawName: "Ley N.° 8968, de Protección de la Persona frente al Tratamiento de sus Datos Personales",
} as const;
