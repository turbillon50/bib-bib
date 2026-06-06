import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getOrCreateDbUser } from '@/lib/db-user';

export const dynamic = 'force-dynamic';

// DELETE /api/invitations/:id — revoca y, si fue usada, desactiva al invitado
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getOrCreateDbUser();
  if (!me) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const sql = getDb();
  const rows = (await sql.query(
    `SELECT id, invited_by, used_by FROM invitations WHERE id = $1 LIMIT 1`,
    [params.id]
  )) as any[];
  const inv = rows[0];
  if (!inv) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });

  const isPriv = me.role === 'owner' || me.role === 'admin';
  if (!isPriv && inv.invited_by !== me.id) {
    return NextResponse.json({ error: 'No puedes revocar esta invitación' }, { status: 403 });
  }

  await sql.query(`UPDATE invitations SET is_active = false WHERE id = $1`, [params.id]);

  let revokedUserId: string | null = null;
  if (inv.used_by) {
    const t = (await sql.query(`SELECT id, role FROM users WHERE id = $1`, [inv.used_by])) as any[];
    if (t[0] && t[0].role !== 'admin' && t[0].role !== 'owner') {
      await sql.query(`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`, [inv.used_by]);
      revokedUserId = inv.used_by;
    }
  }
  return NextResponse.json({ ok: true, revokedUserId });
}
