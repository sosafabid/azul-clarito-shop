import Image from "next/image";
import Link from "next/link";
import { BagIcon } from "@/components/ui/icons";
import { routes } from "@/config/routes";
import { parseInline, type BlogBlock, type BlogPost } from "@/domain/blog";

/** Lo mínimo de un producto que necesita el artículo (viene de la tienda, nunca se escribe a mano). */
export type BlogProduct = { slug: string; name: string; imageUrl: string | null; imageAlt: string | null };

const body = "text-lg leading-[1.8] text-ink/90";

/** Texto con enlaces internos (`[texto](/ruta)`) convertidos en enlaces reales. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, index) =>
        part.href ? <Link key={index} href={part.href} className="font-semibold text-navy underline decoration-aqua decoration-2 underline-offset-4 hover:decoration-navy">{part.text}</Link> : <span key={index}>{part.text}</span>,
      )}
    </>
  );
}

function Block({ block, products, verb }: { block: BlogBlock; products: Map<string, BlogProduct>; verb: string }) {
  switch (block.type) {
    case "p":
      return <p className={body}><Inline text={block.text} /></p>;
    case "h3":
      return <h3 className="pt-2 font-display text-2xl font-bold text-navy">{block.text}</h3>;
    case "quote":
      return (
        <blockquote className="rounded-r-3xl border-l-4 border-sun bg-celeste/25 px-6 py-5 font-display text-xl font-medium leading-relaxed text-navy sm:text-2xl">
          <Inline text={block.text} />
        </blockquote>
      );
    case "list":
      return (
        <ul className={`${body} list-disc space-y-2 pl-6`}>
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      );
    case "bullets":
      return (
        <ul className={`${body} list-disc space-y-3 pl-6 marker:text-navy/50`}>
          {block.items.map((item) => (
            <li key={item.lead}><strong className="font-semibold text-navy">{item.lead}</strong> {item.text}</li>
          ))}
        </ul>
      );
    case "styleGuide":
      return (
        <dl className="grid gap-4 sm:grid-cols-2">
          {block.items.map((item) => (
            <div key={item.name} className="rounded-3xl border border-celeste bg-celeste/25 p-6">
              <dt className="font-display text-xl font-bold text-navy">{item.name}</dt>
              <dd className="mt-2 leading-relaxed text-ink/85">{item.text}</dd>
            </div>
          ))}
        </dl>
      );
    case "faceGuide":
      return (
        <ul className="divide-y divide-celeste/70 rounded-3xl border border-celeste bg-paper">
          {block.items.map((item) => (
            <li key={item.shape} className="grid gap-1 p-5 sm:grid-cols-[11rem_1fr] sm:gap-6 sm:p-6">
              <p className="font-display text-lg font-bold text-navy">{item.shape}</p>
              <p className="leading-relaxed text-ink/85">{item.text}</p>
            </li>
          ))}
        </ul>
      );
    case "tips":
      return (
        <ol className="space-y-5">
          {block.items.map((item, index) => (
            <li key={item.title} className="flex gap-4">
              <span aria-hidden="true" className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-sun font-display text-lg font-bold text-navy">{index + 1}</span>
              <div>
                <h3 className="font-display text-xl font-bold text-navy">{item.title}</h3>
                <p className="mt-1 leading-relaxed text-ink/85">{item.text}</p>
              </div>
            </li>
          ))}
        </ol>
      );
    case "models":
      return (
        <ul className="space-y-6">
          {block.items.map((model) => {
            const product = products.get(model.slug);
            return (
              <li key={model.slug} className="overflow-hidden rounded-3xl border border-celeste bg-paper shadow-soft sm:grid sm:grid-cols-[minmax(0,15rem)_1fr]">
                <Link
                  href={routes.product(model.slug)}
                  aria-label={`Ver ${product?.name ?? model.name} en la tienda`}
                  className="relative block aspect-[4/3] bg-gradient-to-br from-celeste via-celeste/60 to-sand/60 sm:aspect-auto sm:min-h-56"
                >
                  {product?.imageUrl ? (
                    <Image src={product.imageUrl} alt={product.imageAlt ?? product.name} fill sizes="(min-width: 640px) 240px, 100vw" unoptimized className="object-cover" />
                  ) : (
                    <span className="flex size-full items-center justify-center text-navy/40"><BagIcon className="size-14" /></span>
                  )}
                </Link>
                <div className="flex flex-col gap-3 p-6 sm:p-7">
                  <h3 className="font-display text-2xl font-bold text-navy">{product?.name ?? model.name}</h3>
                  {model.visual && <p className="font-display text-sm font-bold uppercase tracking-[0.1em] text-navy/60">{model.visual}</p>}
                  <p className="leading-relaxed text-ink/85">{model.text}</p>
                  <Link href={routes.product(model.slug)} className="mt-auto inline-flex min-h-11 items-center self-start rounded-full bg-navy px-5 font-display font-bold text-paper transition-colors hover:bg-ink">
                    {verb} {product?.name ?? model.name} →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      );
  }
}

export function ArticleBody({ post, products }: { post: BlogPost; products: Map<string, BlogProduct> }) {
  return (
    <div className="space-y-14">
      <div className="space-y-5">
        {post.intro.map((text, index) => (
          <p key={text} className={index === 0 ? "font-display text-xl font-medium leading-[1.7] text-navy sm:text-2xl" : body}><Inline text={text} /></p>
        ))}
      </div>

      {post.sections.map((section) => (
        <section key={section.id} id={section.id} aria-labelledby={`${section.id}-titulo`} className="scroll-mt-24 space-y-6">
          <h2 id={`${section.id}-titulo`} className="text-3xl font-bold sm:text-4xl">{section.title}</h2>
          {section.blocks.map((block, index) => <Block key={index} block={block} products={products} verb={post.modelCtaVerb ?? "Ver"} />)}
        </section>
      ))}
    </div>
  );
}
