/**
 * Consentimientos de las personas usuarias (reglas puras).
 *
 * Cada aceptación o retiro se guarda como un EVENTO (tabla `user_consents`) con la
 * versión del texto y la fecha. El estado actual de cada tipo es el evento más
 * reciente. Así queda el historial (evidencia) y no solo el último valor.
 */
export const CONSENT_TYPES = ["TERMS", "PRIVACY", "MARKETING"] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

/** Sin estos dos no se puede crear la cuenta. MARKETING es siempre opcional. */
export const REQUIRED_CONSENTS: readonly ConsentType[] = ["TERMS", "PRIVACY"];

export const CONSENT_LABELS: Record<ConsentType, string> = {
  TERMS: "Términos y condiciones",
  PRIVACY: "Tratamiento de datos personales (Política de Privacidad)",
  MARKETING: "Comunicaciones comerciales (novedades, lanzamientos y promociones)",
};

export type ConsentEvent = { type: ConsentType; version: string; granted: boolean; createdAt: Date };
export type CurrentConsent = { granted: boolean; version: string; at: Date };

/** Estado actual por tipo: el evento más reciente de cada uno. */
export function currentConsents(events: readonly ConsentEvent[]): Partial<Record<ConsentType, CurrentConsent>> {
  const result: Partial<Record<ConsentType, CurrentConsent>> = {};
  for (const event of events) {
    const existing = result[event.type];
    if (!existing || event.createdAt.getTime() >= existing.at.getTime()) {
      result[event.type] = { granted: event.granted, version: event.version, at: event.createdAt };
    }
  }
  return result;
}

export function hasRequiredConsents(events: readonly ConsentEvent[]): boolean {
  const current = currentConsents(events);
  return REQUIRED_CONSENTS.every((type) => current[type]?.granted === true);
}
