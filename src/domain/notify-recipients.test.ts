import { describe, expect, it } from "vitest";
import { ALWAYS_NOTIFY_EMAIL, parseNotifyRecipients } from "./notify-recipients";

describe("destinatarios del aviso de compra", () => {
  it("siempre incluye fsosa@azulclaritocr.com, aunque la variable no exista o esté vacía", () => {
    expect(parseNotifyRecipients(undefined)).toEqual([ALWAYS_NOTIFY_EMAIL]);
    expect(parseNotifyRecipients("")).toEqual(["fsosa@azulclaritocr.com"]);
  });
  it("suma los de la variable (coma, punto y coma o espacios), sin repetir y en minúsculas", () => {
    expect(parseNotifyRecipients("Otra@Ejemplo.com, fsosa@azulclaritocr.com; ventas@ejemplo.cr")).toEqual(["fsosa@azulclaritocr.com", "otra@ejemplo.com", "ventas@ejemplo.cr"]);
  });
  it("descarta lo que no parece un correo", () => {
    expect(parseNotifyRecipients("no-es-correo, @x.com, a@b")).toEqual(["fsosa@azulclaritocr.com"]);
  });
});
