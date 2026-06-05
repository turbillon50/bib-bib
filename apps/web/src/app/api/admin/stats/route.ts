import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/stats — KPIs del dashboard
export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const sql = getDb();
    const [kpis] = (await sql.query(
      `SELECT
        (SELECT COUNT(*) FROM users)                                              AS total_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days') AS new_users_30d,
        (SELECT COUNT(*) FROM drivers)                                            AS total_drivers,
        (SELECT COUNT(*) FROM drivers WHERE is_online)                            AS drivers_online,
        (SELECT COUNT(*) FROM drivers WHERE approval_status = 'pending')          AS drivers_pending,
        (SELECT COUNT(*) FROM rides)                                              AS total_rides,
        (SELECT COUNT(*) FROM rides WHERE created_at >= CURRENT_DATE)             AS rides_today,
        (SELECT COUNT(*) FROM rides WHERE status IN ('searching','negotiating','accepted','driver_en_route','arrived','in_progress')) AS rides_active,
        (SELECT COUNT(*) FROM rides WHERE status = 'completed')                   AS rides_completed,
        (SELECT COUNT(*) FROM rides WHERE status = 'canceled')                    AS rides_canceled,
        (SELECT COALESCE(SUM(final_price),0) FROM rides WHERE status='completed') AS revenue_total,
        (SELECT COALESCE(SUM(final_price),0) FROM rides WHERE status='completed' AND completed_at >= NOW() - INTERVAL '30 days') AS revenue_30d,
        (SELECT COALESCE(AVG(final_price),0) FROM rides WHERE status='completed') AS avg_ticket`,
      []
    )) as any[];

    const ridesByDay = (await sql.query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS rides,
              COALESCE(SUM(final_price) FILTER (WHERE status='completed'),0) AS revenue
       FROM rides
       WHERE created_at >= NOW() - INTERVAL '14 days'
       GROUP BY 1 ORDER BY 1`,
      []
    )) as any[];

    const recentRides = (await sql.query(
      `SELECT r.id, r.status, r.origin_address, r.destination_address,
              r.final_price, r.proposed_price, r.created_at,
              u.name AS passenger_name
       FROM rides r LEFT JOIN users u ON u.id = r.passenger_id
       ORDER BY r.created_at DESC LIMIT 8`,
      []
    )) as any[];

    return NextResponse.json({ kpis, ridesByDay, recentRides });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    );
  }
}
