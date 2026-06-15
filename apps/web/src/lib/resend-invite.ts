import { Resend } from 'resend';
import { ROLE_LABELS, type AppRole } from './invitations';

// Bib-Bib brand — morado #6C63FF sobre oscuro. SIN dorado (regla permanente).
const BRAND = {
  bg: '#0A0A0F',
  card: '#111118',
  accent: '#6C63FF',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.55)',
};

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL || 'Bib-Bib <no-reply@bib-bib.ink>';

function appUrl(): string {
  return (process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://bib-bib.ink').replace(/\/+$/, '');
}

function template(opts: { role: AppRole; inviter: string; link: string; label?: string | null }) {
  const roleLabel = ROLE_LABELS[opts.role] ?? opts.role;
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;background:${BRAND.bg};">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${BRAND.card};border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
        <tr><td style="padding:32px 40px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="display:inline-flex;align-items:center;gap:12px;">
            <div style="width:38px;height:38px;background:${BRAND.accent};border-radius:10px;display:flex;align-items:center;justify-content:center;">
              <span style="color:#fff;font-weight:900;font-size:18px;">R</span>
            </div>
            <div style="color:${BRAND.accent};font-weight:800;font-size:18px;letter-spacing:0.04em;">Bib-Bib</div>
          </div>
        </td></tr>
        <tr><td style="padding:40px;color:${BRAND.text};">
          <h1 style="margin:0 0 8px;font-size:22px;color:${BRAND.text};">Tienes una invitación</h1>
          <p style="margin:0 0 24px;color:${BRAND.muted};font-size:14px;line-height:1.6;">
            <strong style="color:${BRAND.text};">${opts.inviter}</strong> te invitó a unirte a Bib-Bib como
            <strong style="color:${BRAND.accent};">${roleLabel}</strong>${opts.label ? ` — ${opts.label}` : ''}.
          </p>
          <a href="${opts.link}" style="display:inline-block;padding:14px 30px;background:${BRAND.accent};color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">Aceptar invitación</a>
          <p style="margin:28px 0 0;color:${BRAND.muted};font-size:12px;line-height:1.6;">
            O copia este enlace:<br><span style="color:${BRAND.accent};">${opts.link}</span>
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;color:rgba(255,255,255,0.35);font-size:11px;text-align:center;">
            © ${new Date().getFullYear()} Bib-Bib · <a href="${appUrl()}" style="color:${BRAND.accent};text-decoration:none;">bib-bib.ink</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendInviteEmail(opts: {
  to: string; role: AppRole; inviter: string; code: string; label?: string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  const link = `${appUrl()}/invite/${opts.code}`;
  if (!resend) return { sent: false, reason: 'RESEND_API_KEY no configurado' };
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: `Bib-Bib — ${opts.inviter} te invitó como ${ROLE_LABELS[opts.role] ?? opts.role}`,
      html: template({ role: opts.role, inviter: opts.inviter, link, label: opts.label }),
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : 'Error enviando email' };
  }
}

export function inviteLink(code: string): string {
  return `${appUrl()}/invite/${code}`;
}
