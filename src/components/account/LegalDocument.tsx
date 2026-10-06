import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/Notice";
import { legalConfig } from "@/config/legal";

/** Contenedor de los textos legales, con el aviso de "texto provisional" mientras no estén revisados. */
export function LegalDocument({ title, version, children }: { title: string; version: string; children: React.ReactNode }) {
  return (
    <section className="bg-paper py-12 sm:py-16">
      <Container size="narrow">
        <h1 className="text-4xl font-bold sm:text-5xl">{title}</h1>
        <p className="mt-2 text-sm text-ink/60">Versión {version}</p>
        {!legalConfig.reviewed && (
          <Notice tone="warning" className="mt-6">
            <strong>Texto provisional.</strong> Este documento es una base de trabajo y todavía no fue revisado por una persona abogada. Se actualizará antes del
            lanzamiento de la tienda.
          </Notice>
        )}
        <div className="mt-8 space-y-6 leading-relaxed text-ink/90 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-6">{children}</div>
      </Container>
    </section>
  );
}
