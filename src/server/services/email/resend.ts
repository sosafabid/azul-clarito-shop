import "server-only";
import { randomUUID } from "node:crypto";
import type { EmailResult, EmailService } from "./service";
import type { EmailEvent, EmailRequest } from "./events";
import { renderEmailVerification, renderPasswordChanged, renderPasswordReset, renderStaffInvitation, type RenderedEmail } from "./templates";

/**
 * Proveedor Resend, llamado por HTTPS directo (API REST) desde el SERVIDOR.
 * La clave (`RESEND_API_KEY`) nunca sale de aquí: no se registra en logs ni llega al navegador.
 *
 * Solo se arman los correos de la cuenta; los de pedidos todavía no tienen plantilla
 * (se devuelven como `no_template` en vez de enviar algo a medias).
 */
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;

export class ResendEmailService implements EmailService {
  constructor(private readonly options: { apiKey: string; from: string; baseUrl: string }) {}

  private render<E extends EmailEvent>(request: EmailRequest<E>): RenderedEmail | null {
    const { baseUrl } = this.options;
    switch (request.event) {
      case "email_verification":
        return renderEmailVerification(request.data as never, baseUrl);
      case "password_reset":
        return renderPasswordReset(request.data as never, baseUrl);
      case "password_changed":
        return renderPasswordChanged(request.data as never, baseUrl);
      case "staff_invitation":
        return renderStaffInvitation(request.data as never, baseUrl);
      default:
        return null;
    }
  }

  async send<E extends EmailEvent>(request: EmailRequest<E>): Promise<EmailResult> {
    const email = this.render(request);
    if (!email) return { ok: false, reason: "no_template" };

    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": randomUUID(),
        },
        body: JSON.stringify({ from: this.options.from, to: [request.to], subject: email.subject, html: email.html, text: email.text }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      if (!response.ok) {
        // Solo el código HTTP: el cuerpo puede incluir el correo de la persona.
        console.error(`[email] Resend rechazó el evento "${request.event}" (HTTP ${response.status}).`);
        return { ok: false, reason: "provider_error" };
      }
      return { ok: true };
    } catch (error) {
      console.error(`[email] Falló el envío del evento "${request.event}": ${error instanceof Error ? error.name : "error"}.`);
      return { ok: false, reason: "provider_error" };
    }
  }
}
