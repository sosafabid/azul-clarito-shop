import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Cuando se definan las imágenes de producto (almacenamiento externo/CDN),
    // agregar aquí su dominio en `remotePatterns`.
    remotePatterns: [],
  },
  async headers() {
    // Páginas con un enlace secreto en la URL: que no viaje en `Referer` a otros sitios ni se guarde en cachés.
    const privateLinkHeaders = [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cache-Control", value: "no-store, max-age=0" },
    ];
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
      { source: "/reset-password", headers: privateLinkHeaders },
      { source: "/verify-email", headers: privateLinkHeaders },
      { source: "/staff-invitation", headers: privateLinkHeaders },
    ];
  },
};

export default nextConfig;
