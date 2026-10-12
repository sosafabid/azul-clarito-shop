import { describe, expect, it } from "vitest";
import { BlobAccessError, BlobError, BlobStoreNotFoundError, BlobStoreSuspendedError } from "@vercel/blob";
import { describeStorageError } from "./storage";

describe("describeStorageError (mensajes para quien administra la tienda)", () => {
  it("traduce los errores conocidos del almacén y nunca incluye un token", () => {
    expect(describeStorageError(new BlobAccessError())).toMatch(/rechazó el token/);
    expect(describeStorageError(new BlobStoreNotFoundError())).toMatch(/no existe/);
    expect(describeStorageError(new BlobStoreSuspendedError())).toMatch(/suspendido/);
    for (const error of [new BlobAccessError(), new BlobStoreNotFoundError(), new Error("vercel_blob_rw_abc_SECRET")]) {
      expect(describeStorageError(error)).not.toMatch(/vercel_blob_rw/);
    }
  });
  it("detecta un almacén público usado con acceso privado y cae a un mensaje genérico en lo demás", () => {
    expect(describeStorageError(new BlobError("Cannot use private access on a public store"))).toMatch(/PÚBLICO/);
    expect(describeStorageError(new BlobError("algo raro"))).toMatch(/Vercel Blob devolvió un error/);
    expect(describeStorageError(new TypeError("fetch failed"))).toMatch(/No se pudo conectar/);
  });
});
