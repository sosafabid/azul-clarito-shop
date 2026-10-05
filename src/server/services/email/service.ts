import "server-only";
import type { EmailEvent, EmailRequest } from "./events";

/**
 * Capa de emails. TODAVÍA NO está conectado ningún proveedor (Resend u otro):
 * hoy `getEmailService()` devuelve un servicio que NO envía nada.
 *
 * Para conectar Resend más adelante: crear `resend.ts` con una clase que
 * implemente `EmailService` (plantillas por evento + `RESEND_API_KEY`) y
 * devolverla desde `getEmailService()`. El resto del código no cambia.
 */
export interface EmailService {
  send<E extends EmailEvent>(request: EmailRequest<E>): Promise<void>;
}

/** No envía nada. En desarrollo deja constancia del evento (sin datos personales). */
class NoopEmailService implements EmailService {
  async send<E extends EmailEvent>(request: EmailRequest<E>): Promise<void> {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email:noop] evento "${request.event}" no enviado (proveedor sin configurar).`);
    }
  }
}

let service: EmailService | undefined;

export function getEmailService(): EmailService {
  service ??= new NoopEmailService();
  return service;
}
