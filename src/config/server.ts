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
} as const;
