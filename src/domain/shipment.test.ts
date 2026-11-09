import { describe, expect, it } from "vitest";
import { parseShipment, shipmentEmailKey } from "./shipment";

describe("guía de envío", () => {
  it("para marcar como enviado exige el número de guía", () => {
    expect(parseShipment({ carrier: "Correos de Costa Rica" }, { requireTracking: true }).ok).toBe(false);
    expect(parseShipment({ trackingNumber: " 12 " }, { requireTracking: true }).ok).toBe(false);
    const ok = parseShipment({ carrier: " Correos  de CR ", trackingNumber: " CR123456789 " }, { requireTracking: true });
    expect(ok).toEqual({ ok: true, value: { carrier: "Correos de CR", trackingNumber: "CR123456789", trackingUrl: null } });
  });
  it("sin exigirla, los campos vacíos quedan en null", () => {
    expect(parseShipment({}, { requireTracking: false })).toEqual({ ok: true, value: { carrier: null, trackingNumber: null, trackingUrl: null } });
  });
  it("el enlace de seguimiento solo puede ser http(s)", () => {
    expect(parseShipment({ trackingNumber: "CR123", trackingUrl: "javascript:alert(1)" }, { requireTracking: true }).ok).toBe(false);
    expect(parseShipment({ trackingNumber: "CR123", trackingUrl: "https://correos.go.cr/rastreo?g=CR123" }, { requireTracking: true }).ok).toBe(true);
  });
  it("la clave del correo: igual guía = misma clave; guía corregida = clave nueva", () => {
    const a = { carrier: "Correos", trackingNumber: "CR1", trackingUrl: null };
    expect(shipmentEmailKey(a)).toBe(shipmentEmailKey({ ...a }));
    expect(shipmentEmailKey(a)).not.toBe(shipmentEmailKey({ ...a, trackingNumber: "CR2" }));
    expect(shipmentEmailKey(a)).toMatch(/^order_shipped:[0-9a-f]{8}$/);
  });
});
