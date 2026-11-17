import { validateBlogPost, type BlogPost } from "@/domain/blog";
import { comoElegirAnteojosDeSol } from "./como-elegir-anteojos-de-sol";
import { regalosParaMujer } from "./regalos-para-mujer-inspiracion-caribena";

/**
 * Registro de artículos de Diario Azul. Para publicar uno nuevo: crear su archivo en esta carpeta (con su portada en
 * /public/blog) y agregarlo a la lista. Antes de publicar corre `npm run blog:check`; el build también lo ejecuta.
 */
const REGISTERED: readonly BlogPost[] = [regalosParaMujer, comoElegirAnteojosDeSol];

/** Todos los artículos registrados, del más reciente al más antiguo (con la misma fecha, queda primero el que está antes en la lista). Solo para validar. */
export const ALL_BLOG_POSTS: readonly BlogPost[] = [...REGISTERED].sort((a, b) => b.date.localeCompare(a.date));

/**
 * Artículos PUBLICABLES. Un artículo que incumple las reglas (por ejemplo, sin portada) nunca llega al sitio público:
 * ni tarjeta vacía, ni página, ni sitemap. El build avisa antes (ver scripts/check-blog.ts).
 */
export const BLOG_POSTS: readonly BlogPost[] = ALL_BLOG_POSTS.filter((post) => {
  const issues = validateBlogPost(post);
  if (issues.length > 0) console.error(`[blog] "${post.slug}" no se publica: ${issues.join(" ")}`);
  return issues.length === 0;
});

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
