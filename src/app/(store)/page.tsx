import type { Metadata } from "next";
import { CategoryTile } from "@/components/home/CategoryTile";
import { BagIcon, BookIcon, HibiscusIcon, MusicIcon, SparkleIcon } from "@/components/ui/icons";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { mainSiteRoutes, routes } from "@/config/routes";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} — ${siteConfig.tagline}` },
  alternates: { canonical: "/" },
};

const tiles = [
  { title: "Productos", icon: <BagIcon className="size-7" />, tone: "bg-celeste" },
  { title: "Libros", icon: <BookIcon className="size-7" />, tone: "bg-sand/70" },
  { title: "Música", icon: <MusicIcon className="size-7" />, tone: "bg-blush/45" },
  { title: "Objetos especiales", icon: <SparkleIcon className="size-7" />, tone: "bg-aqua/25" },
];

export default function HomePage() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-celeste via-celeste/45 to-paper">
        {/* Sol y flor: elementos secundarios de identidad */}
        <div
          aria-hidden="true"
          className="absolute -right-16 top-10 -z-10 size-56 rounded-full bg-sun shadow-[0_0_120px_40px_rgb(255_198_41/0.35)] motion-safe:animate-pulse sm:right-12 sm:size-72"
        />
        <HibiscusIcon className="absolute -left-6 bottom-28 -z-10 size-40 rotate-12 text-coral/25 sm:left-10 sm:size-56" />

        <Container className="pb-8 pt-16 sm:pb-12 sm:pt-24">
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-navy/70">
            Limón, Costa Rica
          </p>
          <h1 className="mt-4 text-6xl font-bold leading-[0.95] sm:text-8xl">
            Azul Clarito
            <span className="relative mt-2 block w-fit text-coral">
              Shop
              <svg
                viewBox="0 0 200 14"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="absolute -bottom-2 left-0 h-3 w-full text-aqua"
              >
                <path
                  d="M2 8 C 22 0, 42 14, 62 7 S 102 0, 122 7 S 162 14, 198 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <p className="mt-8 max-w-xl text-xl leading-relaxed text-ink sm:text-2xl">{siteConfig.tagline}</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <ButtonLink href={routes.shop}>Ver la tienda</ButtonLink>
            <ButtonLink href={siteConfig.mainSiteUrl} variant="outline">
              Conocer a Azul Clarito
            </ButtonLink>
          </div>
        </Container>
        <WaveDivider className="fill-paper" />
      </section>

      <section aria-labelledby="secciones" className="bg-paper pb-20 pt-6 sm:pb-28">
        <Container>
          <h2 id="secciones" className="max-w-md text-3xl font-bold sm:text-4xl">
            Lo que viene
          </h2>
          <p className="mt-3 max-w-lg text-lg text-ink/75">
            Estamos armando cada sección con calma. Muy pronto vas a encontrarlas acá.
          </p>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((tile) => (
              <CategoryTile key={tile.title} {...tile} />
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="mientras-tanto" className="bg-celeste/35 py-16 sm:py-20">
        <Container className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="mientras-tanto" className="text-2xl font-bold sm:text-3xl">
              Mientras tanto, descubrí a Azul Clarito
            </h2>
            <p className="mt-2 text-ink/75">Música, historias y libros en el sitio oficial.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={`${siteConfig.mainSiteUrl}${mainSiteRoutes.music}`} variant="light">
              Escuchar música
            </ButtonLink>
            <ButtonLink href={`${siteConfig.mainSiteUrl}${mainSiteRoutes.ep}`} variant="light">
              Memorias del Mar
            </ButtonLink>
            <ButtonLink href={`${siteConfig.mainSiteUrl}${mainSiteRoutes.books}`} variant="light">
              Libros
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
