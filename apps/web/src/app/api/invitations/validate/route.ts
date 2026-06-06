import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ROLE_LABELS, type AppRole } from '@/lib/invitations';

export const dynamic = 'force-dynamic';

// GET /api/invitations/validate?code=XXXX  (público)
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get('code') ?? '').trim().toUpperCase();
  if (!code) return NextResponse.json({ valid: false, reason: 'Falta el código' });

  try {
    const sql = getDb();
    const rows = (await sql.query(
      `SELECT i.role, i.label, i.used_by, i.expires_at, i.is_active, u.name AS inviter
         FROM invitations i LEFT JOIN users u ON u.id = i.invited_by
        WHERE i.code = $1 LIMIT 1`,
      [code]
    )) as any[];
    const inv = rows[0];
    if (!inv || !inv.is_active) return NextResponse.json({ valid: false, reason: 'Código inválido o revocado' });
    if (inv.used_by) return NextResponse.json({ valid: false, reason: 'Código ya utilizado' });
    if (inv.expires_at && new Date(inv.expires_at) < new Date())
      return NextResponse.json({ valid: false, reason: 'Código expirado' });

    return NextResponse.json({
      valid: true,
      role: inv.role,
      roleLabel: ROLE_LABELS[inv.role as AppRole] ?? inv.role,
      label: inv.label ?? null,
      invitedBy: inv.inviter ?? null,
    });
  } catch (err: any) {
    const reason = err?.code === '42P01' ? 'Tabla de invitaciones no inicializada' : (err?.message ?? 'Error de base de datos');
    return NextResponse.json({ valid: false, reason });
  }
}
