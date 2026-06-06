import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getOrCreateDbUser } from '@/lib/db-user';
import { canInvite, allowedRolesFor, ROLE_LABELS, type AppRole } from '@/lib/invitations';
import { sendInviteEmail, inviteLink } from '@/lib/resend-invite';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

// GET /api/invitations — lista (owner/admin ven todas, demás solo las suyas) + roles permitidos
export async function GET() {
  const me = await getOrCreateDbUser();
  if (!me) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const sql = getDb();
  const isPriv = me.role === 'owner' || me.role === 'admin';
  const rows = (await sql.query(
    `SELECT i.id, i.code, i.role, i.email, i.label, i.invited_by, i.used_by, i.used_at,
            i.expires_at, i.is_active, i.created_at,
            inv.name AS inviter_name, usr.name AS used_by_name
       FROM invitations i
       LEFT JOIN users inv ON inv.id = i.invited_by
       LEFT JOIN users usr ON usr.id = i.used_by
       ${isPriv ? '' : 'WHERE i.invited_by = $1'}
       ORDER BY i.created_at DESC`,
    isPriv ? [] : [me.id]
  )) as any[];

  const withLinks = rows.map((r) => ({ ...r, link: inviteLink(r.code) }));
  return NextResponse.json({
    invitations: withLinks,
    me: { id: me.id, name: me.name, role: me.role },
    allowedRoles: allowedRolesFor(me.role as AppRole).map((r) => ({ value: r, label: ROLE_LABELS[r] })),
  });
}

// POST /api/invitations { role, email?, label?, expiresAt? }
export async function POST(req: NextRequest) {
  const me = await getOrCreateDbUser();
  if (!me) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (me.is_blocked) return NextResponse.json({ error: 'Cuenta bloqueada' }, { status: 403 });

  const { role, email, label, expiresAt } = (await req.json().catch(() => ({}))) as {
    role?: string; email?: string; label?: string; expiresAt?: string;
  };

  if (!role) return NextResponse.json({ error: 'Falta el rol' }, { status: 400 });
  if (!canInvite(me.role as AppRole, role)) {
    return NextResponse.json(
      { error: `Como ${ROLE_LABELS[me.role as AppRole] ?? me.role} no puedes invitar ${role}` },
      { status: 403 }
    );
  }

  const sql = getDb();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomBytes(4).toString('hex').toUpperCase();
    try {
      const rows = (await sql.query(
        `INSERT INTO invitations (code, role, email, label, invited_by, expires_at, is_active)
           VALUES ($1, $2::user_role, $3, $4, $5, $6, true)
         RETURNING id, code, role, email, label, invited_by, created_at, expires_at, is_active`,
        [code, role, email?.trim() || null, label?.trim() || null, me.id, expiresAt ? new Date(expiresAt).toISOString() : null]
      )) as any[];
      const inv = rows[0];

      let emailResult: { sent: boolean; reason?: string } | undefined;
      if (email?.trim()) {
        emailResult = await sendInviteEmail({
          to: email.trim(),
          role: role as AppRole,
          inviter: me.name,
          code,
          label: label?.trim() || null,
        });
      }

      return NextResponse.json({ invitation: { ...inv, link: inviteLink(code) }, email: emailResult }, { status: 201 });
    } catch (err: any) {
      if (err?.code === '23505') continue; // unique collision, retry
      return NextResponse.json({ error: err?.message ?? 'Error creando invitación' }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'No se pudo generar un código único' }, { status: 500 });
}
