import Image from "next/image";
import Link from "next/link";
import { CartIcon } from "@/components/ui/icons";
import { mainNav } from "@/config/navigation";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { MobileNav } from "./MobileNav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40">
      <div className="bg-navy text-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-2 text-xs sm:px-8 sm:text-sm">
          <p>Estamos preparando la tienda.</p>
          <a
            href={siteConfig.mainSiteUrl}
            className="font-semibold underline decoration-paper/40 underline-offset-4 hover:decoration-paper"
          >
            Ir a azulclaritocr.com
          </a>
        </div>
      </div>

      <div className="relative border-b border-celeste bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link href={routes.home} aria-label={`${siteConfig.name}, inicio`} className="shrink-0">
            <Image
              src="/brand/logo-horizontal.jpg"
              alt={siteConfig.shortName}
              width={520}
              height={250}
              priority
              className="h-11 w-auto"
            />
          </Link>

          <div className="flex items-center gap-1">
            <nav aria-label="Principal" className="hidden sm:block">
              <ul className="flex items-center gap-1">
                {mainNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="rounded-full px-4 py-2 font-display text-sm font-semibold text-navy hover:bg-celeste/60"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <Link
              href={routes.cart}
              aria-label="Carrito"
              className="inline-flex size-11 items-center justify-center rounded-full text-navy hover:bg-celeste/60"
            >
              <CartIcon className="size-6" />
            </Link>
            <MobileNav items={mainNav} />
          </div>
        </div>
      </div>
    </header>
  );
}
