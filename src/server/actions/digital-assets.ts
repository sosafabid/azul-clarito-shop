"use server";

import { revalidatePath } from "next/cache";
import { routes } from "@/config/routes";
import { getDb, isDatabaseConfigured } from "@/db";
import { requirePermission } from "@/server/auth";
import { allowAttempt } from "@/server/auth/throttle";
import { resolveAuditActor } from "@/server/services/audit";
import { attachDigitalAsset } from "@/server/services/digital/assets";
import type { StorageProbe } from "@/domain/fulfillment";
import { probeDigitalStorage } from "@/server/services/digital/storage";

/**
 * Vincula el PDF recién subido (directo desde el navegador al almacén PRIVADO) con un producto digital.
 * Como toda acción del panel, empieza por `requirePermission`. El servidor vuelve a leer el archivo y comprueba que sea un PDF.
 */
export type AttachAssetState = { ok: boolean; message: string };

export async function attachDigitalAssetAction(productId: string, pathname: string, fileName: string): Promise<AttachAssetState> {
  const session = await requirePermission("products:write");
  if (!isDatabaseConfigured()) return { ok: false, message: "La base de datos no está configurada." };
  const db = getDb();
  if (!(await allowAttempt(db, "digital_attach", session.userId, { max: 30, windowSeconds: 10 * 60 }))) return { ok: false, message: "Hiciste muchos intentos seguidos. Esperá unos minutos." };
  const result = await attachDigitalAsset(db, { productId, pathname: String(pathname), fileName: String(fileName ?? ""), actor: resolveAuditActor(session) });
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath(routes.adminProduct(productId));
  return { ok: true, message: result.replaced ? "Archivo reemplazado. Las compras nuevas y las descargas futuras usan esta versión." : "Archivo guardado en el almacén privado." };
}

/** "Probar almacenamiento": escribe, lee y borra un PDF diminuto en el almacén privado para validar la configuración. */
export async function testDigitalStorageAction(): Promise<StorageProbe> {
  const session = await requirePermission("products:write");
  if (!isDatabaseConfigured()) return { ok: false, message: "La base de datos no está configurada.", steps: [] };
  const db = getDb();
  if (!(await allowAttempt(db, "digital_probe", session.userId, { max: 10, windowSeconds: 10 * 60 }))) return { ok: false, message: "Hiciste muchas pruebas seguidas. Esperá unos minutos.", steps: [] };
  return probeDigitalStorage();
}
