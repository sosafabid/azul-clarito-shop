import "server-only";

/** Lee una variable de entorno obligatoria y falla con un mensaje claro si falta. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Copiá .env.example a .env.local y completala (ver README.md).`,
    );
  }
  return value;
}

/** Lee una variable opcional; devuelve `undefined` si está vacía. */
export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value ? value : undefined;
}
