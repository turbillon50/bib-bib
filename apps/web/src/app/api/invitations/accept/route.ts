import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getOrCreateDbUser } from '@/lib/db-user';
import { ROLE_DASHBOARD, type AppRole } from '@/lib/invitations';

export const dynamic = 'force-dynamic';

// POST /api/invitations/accept { code }
export async function POST(req: NextRequest) {
  const me = await getOrCreateDbUser();
  if (!me) return NextResponse.json({ error: 'Debes iniciar sesión para aceptar' }, { status: 401 });

  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const norm = (code ?? '').trim().toUpperCase();
  if (!norm) return NextResponse.json({ error: 'Falta el código' }, { status: 400 });

  const sql = getDb();
  const rows = (await sql.query(
    `SELECT id, role, used_by, expires_at, is_active FROM invitations WHERE code = $1 LIMIT 1`,
    [norm]
  )) as any[];
  const inv = rows[0];
  if (!inv || !inv.is_active) return NextResponse.json({ error: 'Código inválido o revocado' }, { status: 400 });
  if (inv.used_by) return NextResponse.json({ error: 'Código ya utilizado' }, { status: 400 });
  if (inv.expires_at && new Date(inv.expires_at) < new Date())
    return NextResponse.json({ error: 'Código expirado' }, { status: 400 });

  // No degradar a un owner/admin existente.
  const targetRole: AppRole = (me.role === 'owner' || me.role === 'admin') ? me.role : inv.role;

  await sql.query(
    `UPDATE users SET role = $2::user_role, is_active = true, updated_at = NOW() WHERE id = $1`,
    [me.id, targetRole]
  );
  await sql.query(
    `UPDATE invitations SET used_by = $1, used_at = NOW(), is_active = false WHERE id = $2`,
    [me.id, inv.id]
  );

  return NextResponse.json({ ok: true, role: targetRole, redirect: ROLE_DASHBOARD[targetRole] ?? '/app' });
}
