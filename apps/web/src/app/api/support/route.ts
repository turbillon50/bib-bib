import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-auth';
import {
  getOptionalResend,
  getSupportDb,
  isEmail,
  supportAdminEmail,
  supportFromEmail,
} from '@/lib/support-db';

export const dynamic = 'force-dynamic';

type SupportTicket = {
  id: string;
  project: string;
  user_ref: string | null;
  message: string;
  screenshot: string | null;
  response: string | null;
  ts: string;
  status: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function ensureSupportSchema() {
  const sql = getSupportDb();
  await sql.query(
    `CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      project TEXT NOT NULL,
      user_ref TEXT,
      message TEXT NOT NULL,
      screenshot TEXT,
      response TEXT,
      ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'open'
    )`,
    []
  );
  await sql.query(`ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS response TEXT`, []);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_support_tickets_project_ts ON support_tickets(project, ts DESC)`, []);
  return sql;
}

async function notifyAdmin(ticket: SupportTicket) {
  const resend = getOptionalResend();
  const to = supportAdminEmail();
  if (!resend || !to) return;

  await resend.emails.send({
    from: supportFromEmail(),
    to,
    subject: 'RideMe soporte - nuevo reporte',
    html: `
      <div style="font-family:Arial,sans-serif;background:#0A0A0F;color:#fff;padding:24px">
        <h1 style="color:#6C63FF">Nuevo ticket RideMe</h1>
        <p><strong>Usuario:</strong> ${escapeHtml(ticket.user_ref || 'anonimo')}</p>
        <p><strong>Mensaje:</strong></p>
        <p style="white-space:pre-wrap">${escapeHtml(ticket.message)}</p>
        ${ticket.screenshot ? `<p><strong>Screenshot:</strong> <a style="color:#00D4AA" href="${escapeHtml(ticket.screenshot)}">${escapeHtml(ticket.screenshot)}</a></p>` : ''}
      </div>
    `,
  });
}

async function notifyUser(ticket: SupportTicket, reply: string, resolved: boolean) {
  const resend = getOptionalResend();
  if (!resend || !isEmail(ticket.user_ref)) return;

  await resend.emails.send({
    from: supportFromEmail(),
    to: ticket.user_ref,
    subject: resolved ? 'RideMe soporte - ticket resuelto' : 'RideMe soporte - respuesta',
    html: `
      <div style="font-family:Arial,sans-serif;background:#0A0A0F;color:#fff;padding:24px">
        <h1 style="color:#6C63FF">Soporte RideMe</h1>
        <p>Tenemos una actualizacion sobre tu reporte.</p>
        ${reply ? `<p style="white-space:pre-wrap">${escapeHtml(reply)}</p>` : ''}
        <p style="color:rgba(255,255,255,.55)">Estado: ${escapeHtml(ticket.status)}</p>
      </div>
    `,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { message?: string; screenshot?: string; userRef?: string };
    const message = body.message?.trim();
    if (!message || message.length < 4) {
      return NextResponse.json({ error: 'Describe el problema con mas detalle.' }, { status: 400 });
    }

    const ticket: SupportTicket = {
      id: crypto.randomUUID(),
      project: 'rideme',
      user_ref: body.userRef?.trim().slice(0, 255) || 'anonymous',
      message: message.slice(0, 4000),
      screenshot: body.screenshot?.trim().slice(0, 1000) || null,
      response: null,
      ts: new Date().toISOString(),
      status: 'open',
    };

    const sql = await ensureSupportSchema();
    const rows = (await sql.query(
      `INSERT INTO support_tickets (id, project, user_ref, message, screenshot, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, project, user_ref, message, screenshot, response, ts, status`,
      [ticket.id, ticket.project, ticket.user_ref, ticket.message, ticket.screenshot, ticket.status]
    )) as SupportTicket[];

    notifyAdmin(rows[0]).catch(() => {});
    return NextResponse.json({ ticket: rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error creando ticket' },
      { status: 500 }
    );
  }
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 });
  }

  try {
    const sql = await ensureSupportSchema();
    const rows = (await sql.query(
      `SELECT id, project, user_ref, message, screenshot, response, ts, status
       FROM support_tickets
       WHERE project = $1
       ORDER BY ts DESC
       LIMIT 100`,
      ['rideme']
    )) as SupportTicket[];

    return NextResponse.json({ tickets: rows });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error cargando soporte' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 });
  }

  try {
    const body = (await req.json()) as { id?: string; status?: string; response?: string };
    if (!body.id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

    const status = body.status === 'resolved' ? 'resolved' : 'open';
    const response = body.response?.trim().slice(0, 4000) || null;
    const sql = await ensureSupportSchema();
    const rows = (await sql.query(
      `UPDATE support_tickets
       SET status = $2, response = COALESCE($3, response)
       WHERE project = $1 AND id = $4
       RETURNING id, project, user_ref, message, screenshot, response, ts, status`,
      ['rideme', status, response, body.id]
    )) as SupportTicket[];

    if (!rows.length) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
    const ticket = rows[0];

    if (response || status === 'resolved') {
      notifyUser(ticket, response || ticket.response || '', status === 'resolved').catch(() => {});
    }

    return NextResponse.json({ ticket });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error actualizando ticket' },
      { status: 500 }
    );
  }
}
