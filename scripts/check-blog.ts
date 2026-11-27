/**
 * Validación de Diario Azul antes de publicar (se ejecuta sola antes de `npm run build`).
 * Falla si algún artículo no cumple las reglas: portada obligatoria con texto alternativo, archivo existente, etc.
 * Uso manual: npm run blog:check
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ALL_BLOG_POSTS } from "../src/content/blog";
import { inlineLinksOf, validateBlogPost } from "../src/domain/blog";

const problems: string[] = [];
for (const post of ALL_BLOG_POSTS) {
  const issues = validateBlogPost(post);
  if (post.image?.src && !existsSync(join(process.cwd(), "public", post.image.src))) issues.push(`No existe el archivo de la portada: public${post.image.src}`);
  // Los enlaces internos a otros artículos deben apuntar a artículos registrados.
  for (const href of inlineLinksOf(post)) {
    const target = /^\/blog\/([a-z0-9-]+)$/.exec(href)?.[1];
    if (target && !ALL_BLOG_POSTS.some((other) => other.slug === target)) issues.push(`El enlace ${href} no apunta a ningún artículo.`);
  }
  for (const issue of issues) problems.push(`  - ${post.slug}: ${issue}`);
}

if (problems.length > 0) {
  console.error("\n⚠ Diario Azul: hay artículos que NO se pueden publicar todavía:\n" + problems.join("\n") + "\n");
  process.exit(1);
}
console.log(`Diario Azul: ${ALL_BLOG_POSTS.length} artículos con portada válida.`);
