import { describe, expect, it } from "vitest";
import {
  CONSENT_VERSION, analyticsItem, buildPurchasePayload, isPurchaseTrackable, isSensitivePath, itemsValue, parseConsent, parseGaMeasurementId, parseMetaPixelId,
  sanitizePageLocation, serializeConsent, shortSignature,
} from "./analytics";

const now = new Date("2026-11-27T18:00:00Z");

describe("IDs de medición", () => {
  it("solo acepta formatos reales; cualquier otra cosa apaga la herramienta", () => {
    expect(parseGaMeasurementId("G-ABC123XYZ9")).toBe("G-ABC123XYZ9");
    expect(parseGaMeasurementId(" G-ABC123XYZ9 ")).toBe("G-ABC123XYZ9");
    for (const bad of [undefined, "", "UA-12345-1", "G-", "g-abc123xyz9", "G-ABC<script>"]) expect(parseGaMeasurementId(bad)).toBeNull();
    expect(parseMetaPixelId("123456789012345")).toBe("123456789012345");
    for (const bad of [undefined, "", "abc", "123", "1234567890 OR 1=1"]) expect(parseMetaPixelId(bad)).toBeNull();
  });
});

describe("productos y montos", () => {
  it("convierte a cifras reales de la moneda, sin inventar conversiones", () => {
    const item = analyticsItem({ sku: "GOR-1", name: "Tutty Gorra", unitPrice: 12000, currency: "CRC", quantity: 2, category: "Gorras", variant: "Talla: M" });
    expect(item).toEqual({ item_id: "GOR-1", item_name: "Tutty Gorra", price: 12000, quantity: 2, item_category: "Gorras", item_variant: "Talla: M" });
    expect(analyticsItem({ sku: "X", name: "N", unitPrice: 1250, currency: "USD" }).price).toBe(12.5);
  });
  it("value = suma de precio × cantidad, sin errores de coma flotante", () => {
    const items = [analyticsItem({ sku: "A", name: "A", unitPrice: 1999, currency: "USD", quantity: 3 }), analyticsItem({ sku: "B", name: "B", unitPrice: 1, currency: "USD", quantity: 1 })];
    expect(itemsValue(items, "USD")).toBe(59.98); // 3 × 19,99 + 0,01
    expect(itemsValue([analyticsItem({ sku: "A", name: "A", unitPrice: 12000, currency: "CRC", quantity: 2 })], "CRC")).toBe(24000);
  });
});

describe("compra", () => {
  const order = {
    orderNumber: "AC-2026-000123", currency: "CRC", subtotal: 30000, taxTotal: 3900, shippingTotal: 2500,
    items: [{ sku: "GOR-1", name: "Tutty Gorra", unitPrice: 12000, quantity: 2 }, { sku: "TOT-1", name: "TUTTYTOTE", unitPrice: 6000, quantity: 1 }],
  };
  it("sale del pedido guardado: id real, moneda real, value = subtotal, impuesto y envío aparte", () => {
    const payload = buildPurchasePayload(order);
    expect(payload).toMatchObject({ transaction_id: "AC-2026-000123", currency: "CRC", value: 30000, tax: 3900, shipping: 2500 });
    expect(payload.items).toHaveLength(2);
    expect(itemsValue(payload.items, "CRC")).toBe(payload.value);
  });
  it("no lleva datos personales ni de pago", () => {
    const payload = buildPurchasePayload(order);
    expect(Object.keys(payload).sort()).toEqual(["currency", "items", "shipping", "tax", "transaction_id", "value"]);
    for (const item of payload.items) expect(Object.keys(item).every((key) => ["item_id", "item_name", "price", "quantity", "item_category", "item_variant"].includes(key))).toBe(true);
  });
  it("solo se mide un pedido pagado y reciente: nunca pendiente, fallido, cancelado ni sin confirmación", () => {
    const paidAt = new Date("2026-11-27T17:00:00Z");
    expect(isPurchaseTrackable({ view: "paid", paidAt, now })).toBe(true);
    for (const view of ["verifying", "failed", "cancelled"]) expect(isPurchaseTrackable({ view, paidAt, now })).toBe(false);
    expect(isPurchaseTrackable({ view: "paid", paidAt: null, now })).toBe(false);
    expect(isPurchaseTrackable({ view: "paid", paidAt: new Date("2026-11-20T17:00:00Z"), now })).toBe(false); // al volver días después no se vuelve a contar
    expect(isPurchaseTrackable({ view: "paid", paidAt: new Date("2026-11-28T17:00:00Z"), now })).toBe(false); // fecha futura = dato raro
  });
});

describe("consentimiento", () => {
  it("ida y vuelta, y sin decisión = todo apagado", () => {
    const raw = serializeConsent({ analytics: true, marketing: false }, now);
    expect(raw).toMatch(new RegExp(`^v${CONSENT_VERSION}\\.10\\.\\d+$`));
    expect(parseConsent(raw, now)).toMatchObject({ analytics: true, marketing: false });
    expect(parseConsent("", now)).toBeNull();
    expect(parseConsent(undefined, now)).toBeNull();
  });
  it("versión distinta, texto mal formado o decisión vencida (180 días) vuelven a preguntar", () => {
    const old = serializeConsent({ analytics: true, marketing: true }, new Date("2026-04-01T00:00:00Z"));
    expect(parseConsent(old, now)).toBeNull();
    expect(parseConsent("v9.11.1790000000", now)).toBeNull();
    expect(parseConsent("v1.12.1790000000", now)).toBeNull();
    expect(parseConsent("basura", now)).toBeNull();
  });
});

describe("privacidad de la URL", () => {
  it("quita el enlace privado del pedido y los datos del checkout; conserva solo filtros públicos", () => {
    expect(sanitizePageLocation("https://shop.azulclaritocr.com/checkout/result?t=SECRETO123")).toBe("https://shop.azulclaritocr.com/checkout/result");
    expect(sanitizePageLocation("https://shop.azulclaritocr.com/checkout?pais=CR&provincia=Limon&ciudad=Puerto+Viejo&cp=70401")).toBe("https://shop.azulclaritocr.com/checkout");
    expect(sanitizePageLocation("https://shop.azulclaritocr.com/shop?categoria=gorras&utm=x&email=a@b.com")).toBe("https://shop.azulclaritocr.com/shop?categoria=gorras");
    expect(sanitizePageLocation("no es una url")).toBe("");
  });
  it("no mide con el Pixel las rutas de cuenta ni de restablecimiento", () => {
    expect(isSensitivePath("/account/orders")).toBe(true);
    expect(isSensitivePath("/reset-password")).toBe(true);
    expect(isSensitivePath("/shop")).toBe(false);
    expect(isSensitivePath("/accounting")).toBe(false);
  });
  it("shortSignature es estable y distingue carritos", () => {
    expect(shortSignature("a:1|b:2")).toBe(shortSignature("a:1|b:2"));
    expect(shortSignature("a:1|b:2")).not.toBe(shortSignature("a:1|b:3"));
  });
});
