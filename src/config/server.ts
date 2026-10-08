import "server-only";
import { resolveAppBaseUrl } from "@/domain/app-url";
import { optionalEnv } from "@/server/env";

/**
 * Configuración SOLO de servidor (puede leer secretos; nunca llega al navegador).
 * Los valores se leen cuando se piden, no al importar el archivo.
 */
export const serverConfig = {
  payments: {
    /** Nombre del proveedor activo (aún no hay ninguno integrado). */
    get provider() {
      return optionalEnv("PAYMENT_PROVIDER");
    },
  },
  /**
   * URL base para los enlaces de los correos (`NEXT_PUBLIC_APP_URL`, o `NEXT_PUBLIC_SITE_URL`
   * del proyecto). En producción solo se aceptan dominios https públicos (ver `domain/app-url.ts`).
   */
  get appBaseUrl() {
    return resolveAppBaseUrl(optionalEnv("NEXT_PUBLIC_APP_URL") ?? optionalEnv("NEXT_PUBLIC_SITE_URL"), process.env.NODE_ENV);
  },
  email: {
    /** Clave de Resend. SOLO servidor: nunca se expone al navegador. */
    get resendApiKey() {
      return optionalEnv("RESEND_API_KEY");
    },
    /** Remitente, p. ej. `Azul Clarito <cuenta@dominio-verificado.com>`. Debe ser un dominio verificado en Resend. */
    get from() {
      return optionalEnv("RESEND_FROM_EMAIL") ?? optionalEnv("EMAIL_FROM");
    },
    /** Dónde avisar de pedidos nuevos a management. */
    get adminNotifyTo() {
      return optionalEnv("ADMIN_NOTIFY_EMAIL");
    },
  },
} as const;
