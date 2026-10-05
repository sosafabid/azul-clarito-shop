import "server-only";
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
  email: {
    get from() {
      return optionalEnv("EMAIL_FROM");
    },
    /** Dónde avisar de pedidos nuevos a management. */
    get adminNotifyTo() {
      return optionalEnv("ADMIN_NOTIFY_EMAIL");
    },
  },
  auth: {
    /** Solo en desarrollo local: permite ver /admin sin iniciar sesión. */
    get devAdminPreview() {
      return process.env.NODE_ENV !== "production" && process.env.DEV_ADMIN_PREVIEW === "true";
    },
  },
} as const;
