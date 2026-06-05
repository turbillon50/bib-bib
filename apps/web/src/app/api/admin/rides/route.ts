import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/rides?status=&q=&from=&to=&page=&limit=
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const sp = req.nextUrl.searchParams;
  const status = sp.get('status');
  const q = sp.get('q');
  const from = sp.get('from');
  const to = sp.get('to');
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '20', 10)));

  const where: string[] = [];
  const params: any[] = [];
  if (status) { params.push(status); where.push(`r.status = $${params.length}::ride_status`); }
  if (q) {
    params.push(`%${q}%`);
    where.push(`(r.origin_address ILIKE $${params.length} OR r.destination_address ILIKE $${params.length} OR u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  if (from) { params.push(from); where.push(`r.created_at >= $${params.length}::timestamptz`); }
  if (to) { params.push(to); where.push(`r.created_at < ($${params.length}::date + 1)`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const sql = getDb();
    const countRows = (await sql.query(
      `SELECT COUNT(*) AS total FROM rides r LEFT JOIN users u ON u.id = r.passenger_id ${whereSql}`,
      params
    )) as any[];
    const total = Number(countRows[0]?.total ?? 0);

    params.push(limit, (page - 1) * limit);
    const rows = (await sql.query(
      `SELECT r.id, r.status, r.origin_address, r.destination_address,
              r.distance_meters, r.duration_seconds, r.proposed_price, r.final_price,
              r.currency, r.payment_method, r.payment_status, r.ride_type,
              r.created_at, r.completed_at, r.canceled_at, r.cancel_reason,
              u.name AS passenger_name, u.email AS passenger_email,
              du.name AS driver_name
       FROM rides r
       LEFT JOIN users u ON u.id = r.passenger_id
       LEFT JOIN drivers d ON d.id = r.driver_id
       LEFT JOIN users du ON du.id = d.user_id
       ${whereSql}
       ORDER BY r.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )) as any[];

    return NextResponse.json({ rides: rows, total, page, limit });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}

// PATCH /api/admin/rides  { id, status?, cancel_reason? }
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const body = await req.json();
    const { id, status, cancel_reason } = body ?? {};
    if (!id || !status) {
      return NextResponse.json({ error: 'Faltan campos: id y status' }, { status: 400 });
    }
    const sql = getDb();
    const rows = (await sql.query(
      `UPDATE rides SET
         status = $2::ride_status,
         cancel_reason = COALESCE($3, cancel_reason),
         canceled_at = CASE WHEN $2 = 'canceled' THEN NOW() ELSE canceled_at END,
         canceled_by = CASE WHEN $2 = 'canceled' THEN 'admin' ELSE canceled_by END,
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, status`,
      [id, status, cancel_reason ?? null]
    )) as any[];
    if (!rows.length) return NextResponse.json({ error: 'Viaje no encontrado' }, { status: 404 });
    return NextResponse.json({ ride: rows[0] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
