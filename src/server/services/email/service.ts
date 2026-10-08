import "server-only";
import { serverConfig } from "@/config/server";
import { ResendEmailService } from "./resend";
import type { EmailEvent, EmailRequest } from "./events";

/**
 * Capa de emails. El proveedor es Resend (ver `resend.ts`); el resto del código solo
 * conoce esta interfaz. Si faltan `RESEND_API_KEY` o `RESEND_FROM_EMAIL`, el servicio
 * NO envía nada y lo informa (falla cerrado: jamás se inventa un remitente).
 */
export type EmailResult = { ok: true } | { ok: false; reason: "not_configured" | "no_template" | "provider_error" };

export interface EmailService {
  send<E extends EmailEvent>(request: EmailRequest<E>): Promise<EmailResult>;
}

/** No envía nada. En desarrollo deja constancia del evento (sin datos personales ni enlaces). */
class NoopEmailService implements EmailService {
  async send<E extends EmailEvent>(request: EmailRequest<E>): Promise<EmailResult> {
    console.warn(`[email] evento "${request.event}" NO enviado: faltan RESEND_API_KEY y/o RESEND_FROM_EMAIL.`);
    return { ok: false, reason: "not_configured" };
  }
}

/** ¿Hay un proveedor de correo configurado (clave + remitente)? */
export function isEmailConfigured(): boolean {
  return Boolean(serverConfig.email.resendApiKey && serverConfig.email.from);
}

export function getEmailService(): EmailService {
  const apiKey = serverConfig.email.resendApiKey;
  const from = serverConfig.email.from;
  if (!apiKey || !from) return new NoopEmailService();
  return new ResendEmailService({ apiKey, from, baseUrl: serverConfig.appBaseUrl });
}
