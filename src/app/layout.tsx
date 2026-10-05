import type { Metadata, Viewport } from "next";
import "@fontsource-variable/nunito";
import "@fontsource-variable/quicksand";
import { siteConfig } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    url: "/",
    images: [
      {
        url: "/brand/og-azul-clarito-shop.jpg",
        width: 1200,
        height: 630,
        alt: "Azul Clarito, una tortuga marina entre las olas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: ["/brand/og-azul-clarito-shop.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b2a5b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={siteConfig.language}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
