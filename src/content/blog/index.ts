import type { BlogPost } from "@/domain/blog";
import { comoElegirAnteojosDeSol } from "./como-elegir-anteojos-de-sol";

/** Todos los artículos de Diario Azul, del más reciente al más antiguo. Para publicar uno nuevo: crear su archivo y agregarlo aquí. */
export const BLOG_POSTS: readonly BlogPost[] = [comoElegirAnteojosDeSol].sort((a, b) => b.date.localeCompare(a.date));

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
