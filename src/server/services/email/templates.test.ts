import { describe, expect, it } from "vitest";
import { escapeHtml, renderEmailVerification, renderPasswordChanged, renderPasswordReset } from "./templates";

const BASE = "https://shop.azulclaritocr.com";
const URL_ = `${BASE}/reset-password?token=abc_DEF-123`;

describe("plantillas de correo de la cuenta", () => {
  it("verificación: asunto, botón y enlace exactos", () => {
    const mail = renderEmailVerification({ name: "María", actionUrl: `${BASE}/verify-email?token=t`, expiresHours: 24 }, BASE);
    expect(mail.subject).toBe("Verificá tu correo — Azul Clarito");
    expect(mail.html).toContain("Verificar mi correo");
    expect(mail.html).toContain(`href="${BASE}/verify-email?token=t"`);
    expect(mail.text).toContain(`${BASE}/verify-email?token=t`);
    expect(mail.html).toContain("24 horas");
  });

  it("restablecimiento: asunto, botón, vencimiento y avisos de seguridad", () => {
    const mail = renderPasswordReset({ name: "María", actionUrl: URL_, expiresMinutes: 60 }, BASE);
    expect(mail.subject).toBe("Restablecé tu contraseña — Azul Clarito");
    expect(mail.html).toContain("Restablecer contraseña");
    expect(mail.html).toContain("60 minutos");
    expect(mail.html).toContain("Si vos no pediste este cambio");
    expect(mail.html).toContain("nunca te va a pedir tu contraseña");
  });

  it("tiene la marca (colores y logo) y es compatible con clientes de correo: sin JavaScript ni recursos externos de estilo", () => {
    for (const mail of [
      renderEmailVerification({ actionUrl: URL_, expiresHours: 24 }, BASE),
      renderPasswordReset({ actionUrl: URL_, expiresMinutes: 60 }, BASE),
      renderPasswordChanged({}, BASE),
    ]) {
      expect(mail.html).not.toMatch(/<script/i);
      expect(mail.html).not.toMatch(/onclick|onerror|javascript:/i);
      expect(mail.html).not.toMatch(/<link\b/i);
      expect(mail.html).not.toMatch(/@import|<style/i);
      expect(mail.html).toContain("#0B2A5B"); // navy
      expect(mail.html).toContain("#BFEAFF"); // celeste
      expect(mail.html).toContain(`${BASE}/brand/logo-icon.png`);
      expect(mail.html).toContain('alt="Azul Clarito"');
      expect(mail.html).toContain('<html lang="es">');
      expect(mail.text.length).toBeGreaterThan(50);
    }
  });

  it("escapa lo que escribe la persona (nombre) para que no inyecte HTML", () => {
    const mail = renderPasswordReset({ name: '<img src=x onerror="alert(1)">', actionUrl: URL_, expiresMinutes: 60 }, BASE);
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).toContain("&lt;img src=x");
    expect(escapeHtml(`"'<>&`)).toBe("&quot;&#39;&lt;&gt;&amp;");
  });

  it("el aviso de cambio de contraseña no contiene ninguna contraseña ni token", () => {
    const mail = renderPasswordChanged({ name: "María" }, BASE);
    expect(mail.html).not.toMatch(/token=/);
    expect(mail.html).toContain(`${BASE}/forgot-password`);
  });
});

import { renderStaffInvitation } from "./templates";

describe("correo de invitación a STAFF", () => {
  it("lleva el enlace, el vencimiento y escapa el nombre de quien invita", () => {
    const mail = renderStaffInvitation({ actionUrl: "https://shop.azulclaritocr.com/staff-invitation?token=abc", expiresHours: 72, invitedByName: "<b>Fabi</b>" }, "https://shop.azulclaritocr.com");
    expect(mail.html).toContain("staff-invitation?token=abc");
    expect(mail.text).toContain("staff-invitation?token=abc");
    expect(mail.html).toContain("72 horas");
    expect(mail.html).not.toContain("<b>Fabi</b>");
    expect(mail.html).not.toMatch(/contraseña:\s*\S+/i);
  });
});
