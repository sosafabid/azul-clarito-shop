import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Por defecto las Server Actions rechazan cuerpos de más de 1 MB: no alcanzaría para subir una foto.
    serverActions: { bodySizeLimit: "5mb" },
  },
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Cuando se definan las imágenes de producto (almacenamiento externo/CDN),
    // agregar aquí su dominio en `remotePatterns`.
    remotePatterns: [],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
