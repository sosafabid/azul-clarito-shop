import Image from "next/image";
import Link from "next/link";
import { mainNav } from "@/config/navigation";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";

const socialLabels = {
  instagram: "Instagram",
  tiktok: "TikTok",
  threads: "Threads",
  youtube: "YouTube",
} as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Link href={routes.home} className="inline-flex items-center gap-3">
            <Image src="/brand/logo-icon.png" alt="" width={48} height={48} className="size-12" />
            <span className="font-display text-xl font-bold">{siteConfig.name}</span>
          </Link>
          <p className="mt-4 max-w-sm leading-relaxed text-paper/75">{siteConfig.tagline}</p>
        </div>

        <nav aria-label="Tienda">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-sun">Tienda</h2>
          <ul className="mt-4 space-y-2.5">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-paper/80 hover:text-paper hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={routes.cart} className="text-paper/80 hover:text-paper hover:underline">
                Carrito
              </Link>
            </li>
            <li>
              <Link href={routes.account} className="text-paper/80 hover:text-paper hover:underline">
                Mi cuenta
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Azul Clarito">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-sun">Azul Clarito</h2>
          <ul className="mt-4 space-y-2.5">
            <li>
              <a href={siteConfig.mainSiteUrl} className="text-paper/80 hover:text-paper hover:underline">
                Sitio oficial
              </a>
            </li>
            {(Object.keys(socialLabels) as Array<keyof typeof socialLabels>).map((key) => (
              <li key={key}>
                <a
                  href={siteConfig.social[key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-paper/80 hover:text-paper hover:underline"
                >
                  {socialLabels[key]}
                </a>
              </li>
            ))}
            <li>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="text-paper/80 hover:text-paper hover:underline"
              >
                Escribinos
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-paper/15">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-5 text-sm text-paper/60 sm:px-8">
          <p>© {year} Azul Clarito · Limón, Costa Rica</p>
          <nav aria-label="Legal" className="flex gap-5">
            <Link href={routes.terms} className="hover:text-paper hover:underline">
              Términos y condiciones
            </Link>
            <Link href={routes.privacy} className="hover:text-paper hover:underline">
              Política de Privacidad
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
