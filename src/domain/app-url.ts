/**
 * URL pública base de la tienda, usada para construir los enlaces de los correos.
 *
 * Regla: en PRODUCCIÓN los enlaces siempre apuntan a https://shop.azulclaritocr.com
 * (o al dominio configurado, si es https y público). Nunca a localhost, 127.0.0.1,
 * una IP ni un *.vercel.app. Y jamás se deduce del encabezado `Host` de la petición
 * (eso permitiría que un atacante hiciera llegar enlaces falsos en un correo legítimo).
 */
export const CANONICAL_APP_URL = "https://shop.azulclaritocr.com";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

function parse(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    return new URL(value.trim());
  } catch {
    return null;
  }
}

/** ¿Es una URL aceptable para enlaces de producción? */
export function isAcceptableProductionUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:") return false;
  if (LOCAL_HOSTS.has(host) || host.endsWith(".localhost")) return false;
  if (host.endsWith(".vercel.app")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false; // IPv4
  return host.includes(".");
}

export function resolveAppBaseUrl(configured: string | undefined, nodeEnv: string | undefined): string {
  const url = parse(configured);
  if (nodeEnv === "production") {
    return url && isAcceptableProductionUrl(url) ? url.origin : CANONICAL_APP_URL;
  }
  return url ? url.origin : "http://localhost:3000";
}
