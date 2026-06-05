import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/users?role=&blocked=&q=&page=&limit=
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const sp = req.nextUrl.searchParams;
  const role = sp.get('role');
  const blocked = sp.get('blocked');
  const q = sp.get('q');
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '20', 10)));

  const where: string[] = [];
  const params: any[] = [];
  if (role) { params.push(role); where.push(`role = $${params.length}::user_role`); }
  if (blocked === 'true') where.push(`is_blocked = true`);
  if (blocked === 'false') where.push(`is_blocked = false`);
  if (q) {
    params.push(`%${q}%`);
    where.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const sql = getDb();
    const countRows = (await sql.query(`SELECT COUNT(*) AS total FROM users ${whereSql}`, params)) as any[];
    const total = Number(countRows[0]?.total ?? 0);

    params.push(limit, (page - 1) * limit);
    const rows = (await sql.query(
      `SELECT id, name, email, phone, role, is_active, is_blocked, created_at, last_seen_at,
              (SELECT COUNT(*) FROM rides WHERE passenger_id = users.id) AS total_rides
       FROM users
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )) as any[];

    return NextResponse.json({ users: rows, total, page, limit });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}

// PATCH /api/admin/users  { id, action: 'toggle_block'|'set_role', role? }
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const { id, action, role } = (await req.json()) ?? {};
    if (!id || !action) {
      return NextResponse.json({ error: 'Faltan campos: id y action' }, { status: 400 });
    }
    const sql = getDb();

    if (action === 'toggle_block') {
      const rows = (await sql.query(
        `UPDATE users SET is_blocked = NOT is_blocked, updated_at = NOW() WHERE id = $1 RETURNING id, is_blocked`,
        [id]
      )) as any[];
      if (!rows.length) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      return NextResponse.json({ user: rows[0] });
    }

    if (action === 'set_role') {
      if (!['passenger', 'driver', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'role inválido' }, { status: 400 });
      }
      const rows = (await sql.query(
        `UPDATE users SET role = $2::user_role, updated_at = NOW() WHERE id = $1 RETURNING id, role`,
        [id, role]
      )) as any[];
      if (!rows.length) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      return NextResponse.json({ user: rows[0] });
    }

    return NextResponse.json({ error: 'action inválida' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
