import type { EmailEventMap } from "./events";

/**
 * PLANTILLAS DE CORREO de la cuenta. Funciones puras (texto → HTML) sin acceso a red.
 *
 * Compatibles con clientes de correo: tablas, estilos en línea, sin JavaScript, sin
 * fuentes externas y sin imágenes imprescindibles (el logo es decorativo y tiene texto
 * alternativo; el botón es un enlace normal con color de respaldo). Todo lo que viene de
 * una persona (su nombre) se escapa. Nunca incluyen contraseñas ni datos sensibles.
 */
export type RenderedEmail = { subject: string; html: string; text: string };

const COLORS = { navy: "#0B2A5B", celeste: "#BFEAFF", aqua: "#00C7F2", sun: "#FFC629", coral: "#FF5B6B", paper: "#FCFEFF", ink: "#16324F", sand: "#F6D9A8" } as const;

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function greeting(name?: string | null): string {
  const clean = (name ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return clean ? `Hola, ${clean}` : "Hola";
}

type Layout = {
  baseUrl: string;
  preheader: string;
  title: string;
  paragraphs: string[];
  button?: { label: string; url: string };
  notes: string[];
};

function layout(l: Layout): string {
  const logo = `${l.baseUrl}/brand/logo-icon.png`;
  const paragraphs = l.paragraphs.map((p) => `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:${COLORS.ink};">${p}</p>`).join("");
  const button = l.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px 0;"><tr><td align="center" bgcolor="${COLORS.navy}" style="border-radius:999px;background-color:${COLORS.navy};"><a href="${escapeHtml(l.button.url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:999px;">${escapeHtml(l.button.label)}</a></td></tr></table>
<p style="margin:0 0 16px 0;font-size:13px;line-height:1.5;color:${COLORS.ink};">Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br><a href="${escapeHtml(l.button.url)}" style="color:${COLORS.navy};word-break:break-all;">${escapeHtml(l.button.url)}</a></p>`
    : "";
  const notes = l.notes.map((n) => `<p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#4a6178;">${n}</p>`).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(l.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.celeste};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(l.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.celeste}" style="background-color:${COLORS.celeste};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;font-family:Arial,Helvetica,sans-serif;">
<tr><td align="center" bgcolor="${COLORS.navy}" style="background-color:${COLORS.navy};border-radius:20px 20px 0 0;padding:24px;">
<img src="${escapeHtml(logo)}" width="64" height="64" alt="Azul Clarito" style="display:block;border:0;border-radius:32px;margin:0 auto 8px auto;">
<span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;color:#FFFFFF;letter-spacing:0.5px;">Azul Clarito</span>
</td></tr>
<tr><td height="6" bgcolor="${COLORS.sun}" style="background-color:${COLORS.sun};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td bgcolor="${COLORS.paper}" style="background-color:${COLORS.paper};padding:32px 28px 20px 28px;">
<h1 style="margin:0 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;color:${COLORS.navy};">${escapeHtml(l.title)}</h1>
${paragraphs}
${button}
${notes}
</td></tr>
<tr><td align="center" bgcolor="${COLORS.sand}" style="background-color:${COLORS.sand};border-radius:0 0 20px 20px;padding:16px 24px;">
<p style="margin:0;font-size:12px;line-height:1.5;color:${COLORS.navy};">Azul Clarito · Limón, Costa Rica<br><a href="${escapeHtml(l.baseUrl)}" style="color:${COLORS.navy};">${escapeHtml(l.baseUrl.replace(/^https?:\/\//, ""))}</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function plain(parts: Array<string | undefined>): string {
  return parts.filter((p): p is string => Boolean(p)).join("\n\n");
}

export function renderEmailVerification(data: EmailEventMap["email_verification"], baseUrl: string): RenderedEmail {
  const subject = "Verificá tu correo — Azul Clarito";
  const hours = data.expiresHours;
  const html = layout({
    baseUrl,
    preheader: "Confirmá tu correo para activar tu cuenta de Azul Clarito.",
    title: "Verificá tu correo",
    paragraphs: [
      `${escapeHtml(greeting(data.name))}, ¡qué alegría tenerte en Azul Clarito!`,
      "Para terminar de crear tu cuenta, confirmá que este correo es tuyo con el botón de abajo.",
    ],
    button: { label: "Verificar mi correo", url: data.actionUrl },
    notes: [
      `Este enlace es de un solo uso y vence en ${hours} horas.`,
      "Si vos no creaste una cuenta en Azul Clarito, ignorá este mensaje: nadie podrá usar tu correo sin este enlace.",
    ],
  });
  const text = plain([
    `${greeting(data.name)}, ¡qué alegría tenerte en Azul Clarito!`,
    "Para terminar de crear tu cuenta, confirmá que este correo es tuyo abriendo este enlace:",
    data.actionUrl,
    `El enlace es de un solo uso y vence en ${hours} horas. Si vos no creaste una cuenta, ignorá este mensaje.`,
    "Azul Clarito · Limón, Costa Rica",
  ]);
  return { subject, html, text };
}

export function renderPasswordReset(data: EmailEventMap["password_reset"], baseUrl: string): RenderedEmail {
  const subject = "Restablecé tu contraseña — Azul Clarito";
  const minutes = data.expiresMinutes;
  const html = layout({
    baseUrl,
    preheader: "Recibimos una solicitud para restablecer tu contraseña.",
    title: "Restablecé tu contraseña",
    paragraphs: [
      `${escapeHtml(greeting(data.name))}.`,
      "Recibimos una solicitud para restablecer la contraseña de tu cuenta de Azul Clarito. Usá el botón de abajo para elegir una nueva.",
    ],
    button: { label: "Restablecer contraseña", url: data.actionUrl },
    notes: [
      `Este enlace es de un solo uso y vence en ${minutes} minutos.`,
      "Si vos no pediste este cambio, ignorá este mensaje: tu contraseña actual sigue funcionando y no se modificó nada.",
      "Por tu seguridad, Azul Clarito nunca te va a pedir tu contraseña por correo ni por mensaje.",
    ],
  });
  const text = plain([
    `${greeting(data.name)}.`,
    "Recibimos una solicitud para restablecer la contraseña de tu cuenta de Azul Clarito. Abrí este enlace para elegir una nueva:",
    data.actionUrl,
    `El enlace es de un solo uso y vence en ${minutes} minutos.`,
    "Si vos no pediste este cambio, ignorá este mensaje: tu contraseña actual sigue funcionando.",
    "Azul Clarito nunca te va a pedir tu contraseña por correo ni por mensaje.",
  ]);
  return { subject, html, text };
}

export function renderPasswordChanged(data: EmailEventMap["password_changed"], baseUrl: string): RenderedEmail {
  const subject = "Tu contraseña fue actualizada — Azul Clarito";
  const forgot = `${baseUrl}/forgot-password`;
  const html = layout({
    baseUrl,
    preheader: "La contraseña de tu cuenta de Azul Clarito fue actualizada.",
    title: "Tu contraseña fue actualizada",
    paragraphs: [
      `${escapeHtml(greeting(data.name))}.`,
      "Te avisamos que la contraseña de tu cuenta de Azul Clarito acaba de cambiar y cerramos las sesiones abiertas.",
    ],
    notes: [
      `Si no fuiste vos, <a href="${escapeHtml(forgot)}" style="color:${COLORS.navy};">restablecé tu contraseña ahora</a> y escribinos para que revisemos tu cuenta.`,
    ],
  });
  const text = plain([
    `${greeting(data.name)}.`,
    "Te avisamos que la contraseña de tu cuenta de Azul Clarito acaba de cambiar y cerramos las sesiones abiertas.",
    `Si no fuiste vos, restablecela ahora: ${forgot}`,
  ]);
  return { subject, html, text };
}

export function renderStaffInvitation(data: EmailEventMap["staff_invitation"], baseUrl: string): RenderedEmail {
  const subject = "Te invitaron al equipo de Azul Clarito";
  const hours = data.expiresHours;
  const who = (data.invitedByName ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  const introPlain = who ? `${who} te invitó a formar parte del equipo de Azul Clarito Shop.` : "Te invitaron a formar parte del equipo de Azul Clarito Shop.";
  const intro = escapeHtml(introPlain);
  const html = layout({
    baseUrl,
    preheader: "Aceptá la invitación para crear tu acceso al equipo.",
    title: "Te invitaron al equipo",
    paragraphs: [intro, "Con el botón de abajo creás tu contraseña y activás tu acceso al panel de trabajo."],
    button: { label: "Aceptar invitación", url: data.actionUrl },
    notes: [
      `Esta invitación es personal, de un solo uso y vence en ${hours} horas.`,
      "Si no esperabas este mensaje, ignorá este correo: sin este enlace nadie puede crear el acceso.",
      "Azul Clarito nunca te va a pedir tu contraseña por correo ni por mensaje.",
    ],
  });
  const text = plain([
    introPlain,
    "Abrí este enlace para crear tu contraseña y activar tu acceso al panel de trabajo:",
    data.actionUrl,
    `La invitación es personal, de un solo uso y vence en ${hours} horas. Si no esperabas este mensaje, ignorala.`,
    "Azul Clarito · Limón, Costa Rica",
  ]);
  return { subject, html, text };
}
