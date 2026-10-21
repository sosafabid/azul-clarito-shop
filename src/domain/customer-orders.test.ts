import { describe, expect, it } from "vitest";
import { customerStatus, safeTrackingUrl } from "./customer-orders";

describe("estado del pedido para la clienta", () => {
  it("traduce cada estado sin exponer nada interno", () => {
    expect(customerStatus("PENDING", true).label).toBe("Pendiente de pago");
    expect(customerStatus("PAID", true).label).toBe("Pago confirmado");
    expect(customerStatus("SHIPPED", true).label).toBe("Enviado");
    expect(customerStatus("CANCELLED", true)).toMatchObject({ label: "Cancelado", tone: "closed" });
    expect(customerStatus("REFUNDED", false).label).toBe("Reembolsado");
  });
  it("un pedido digital pagado queda como completado y explica cómo descargar", () => {
    expect(customerStatus("PAID", false)).toMatchObject({ tone: "done" });
    expect(customerStatus("PAID", false).hint).toMatch(/descarga/);
  });
  it("estado desconocido: genérico", () => expect(customerStatus("XYZ", true).label).toBe("En proceso"));
  it("solo enlaces de seguimiento http(s)", () => {
    expect(safeTrackingUrl("https://correos.go.cr/track?id=1")).toMatch(/^https:/);
    expect(safeTrackingUrl("javascript:alert(1)")).toBeNull();
    expect(safeTrackingUrl("data:text/html,x")).toBeNull();
    expect(safeTrackingUrl("no es url")).toBeNull();
    expect(safeTrackingUrl(null)).toBeNull();
  });
});
