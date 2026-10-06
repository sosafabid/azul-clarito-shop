import { Notice } from "@/components/ui/Notice";

export { Notice };

/** Aviso cuando todavía no hay DATABASE_URL (p. ej. antes de configurar .env.local). */
export function DatabaseNotice() {
  return (
    <Notice tone="warning">
      <strong>La base de datos no está configurada.</strong> Definí <code>DATABASE_URL</code> en <code>.env.local</code> y
      reiniciá el servidor.
    </Notice>
  );
}
