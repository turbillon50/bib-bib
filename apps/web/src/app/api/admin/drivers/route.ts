import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/drivers?status=&online=&q=&page=&limit=
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const sp = req.nextUrl.searchParams;
  const status = sp.get('status');
  const online = sp.get('online');
  const q = sp.get('q');
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '20', 10)));

  const where: string[] = [];
  const params: any[] = [];
  if (status) { params.push(status); where.push(`d.approval_status = $${params.length}::driver_approval_status`); }
  if (online === 'true') where.push(`d.is_online = true`);
  if (online === 'false') where.push(`d.is_online = false`);
  if (q) {
    params.push(`%${q}%`);
    where.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.phone ILIKE $${params.length} OR d.license_number ILIKE $${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const sql = getDb();
    const countRows = (await sql.query(
      `SELECT COUNT(*) AS total FROM drivers d JOIN users u ON u.id = d.user_id ${whereSql}`,
      params
    )) as any[];
    const total = Number(countRows[0]?.total ?? 0);

    params.push(limit, (page - 1) * limit);
    const rows = (await sql.query(
      `SELECT d.id, d.license_number, d.license_expiry_date, d.rating_average, d.rating_count,
              d.total_trips, d.total_earnings, d.is_online, d.is_approved, d.approval_status,
              d.subscription_status, d.created_at,
              u.id AS user_id, u.name, u.email, u.phone, u.is_blocked,
              v.make, v.model, v.plate_number
       FROM drivers d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN LATERAL (
         SELECT make, model, plate_number FROM vehicles WHERE driver_id = d.id AND is_active LIMIT 1
       ) v ON true
       ${whereSql}
       ORDER BY d.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )) as any[];

    return NextResponse.json({ drivers: rows, total, page, limit });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}

// PATCH /api/admin/drivers  { id, action: 'approve'|'reject'|'toggle_block', notes? }
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const { id, action, notes } = (await req.json()) ?? {};
    if (!id || !action) {
      return NextResponse.json({ error: 'Faltan campos: id y action' }, { status: 400 });
    }
    const sql = getDb();

    if (action === 'approve' || action === 'reject') {
      const approved = action === 'approve';
      const rows = (await sql.query(
        `UPDATE drivers SET
           approval_status = $2::driver_approval_status,
           is_approved = $3,
           approval_notes = COALESCE($4, approval_notes),
           updated_at = NOW()
         WHERE id = $1
         RETURNING id, approval_status, is_approved`,
        [id, approved ? 'approved' : 'rejected', approved, notes ?? null]
      )) as any[];
      if (!rows.length) return NextResponse.json({ error: 'Chofer no encontrado' }, { status: 404 });
      return NextResponse.json({ driver: rows[0] });
    }

    if (action === 'toggle_block') {
      const rows = (await sql.query(
        `UPDATE users u SET is_blocked = NOT u.is_blocked, updated_at = NOW()
         FROM drivers d
         WHERE d.id = $1 AND u.id = d.user_id
         RETURNING u.id, u.is_blocked`,
        [id]
      )) as any[];
      if (!rows.length) return NextResponse.json({ error: 'Chofer no encontrado' }, { status: 404 });
      return NextResponse.json({ user: rows[0] });
    }

    return NextResponse.json({ error: 'action inválida' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
