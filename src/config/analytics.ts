/**
 * Configuración PÚBLICA de medición. Todo es opcional: sin ID, el rastreador correspondiente NO existe en la página.
 *  - NEXT_PUBLIC_GA_MEASUREMENT_ID     → Google Analytics 4 (formato G-XXXXXXXXXX).
 *  - NEXT_PUBLIC_META_PIXEL_ID         → Meta Pixel (solo dígitos).
 *  - NEXT_PUBLIC_META_PURCHASE_ENABLED → "true" activa el evento Purchase del Pixel (ver docs/analytics-and-commerce-tracking.md).
 * Los IDs de medición son públicos por naturaleza (viajan en el navegador); no son credenciales.
 */
import { parseGaMeasurementId, parseMetaPixelId } from "@/domain/analytics";

export const analyticsConfig = {
  gaMeasurementId: parseGaMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
  metaPixelId: parseMetaPixelId(process.env.NEXT_PUBLIC_META_PIXEL_ID),
  metaPurchaseEnabled: process.env.NEXT_PUBLIC_META_PURCHASE_ENABLED === "true",
} as const;
