import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getDb } from './db';

/**
 * Admin guard for API routes and server components.
 * A user is admin if:
 *  - their email is in ADMIN_EMAILS (comma-separated env var), or
 *  - their users.role = 'admin' in the database (matched by clerk_id or email)
 */
export async function isAdmin(): Promise<boolean> {
  const { userId } = auth();
  if (!userId) return false;

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase() ?? '';

  const allowlist = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (email && allowlist.includes(email)) return true;

  try {
    const sql = getDb();
    const rows = (await sql.query(
      `SELECT role FROM users WHERE clerk_id = $1 OR LOWER(email) = $2 LIMIT 1`,
      [userId, email]
    )) as Array<{ role: string }>;
    return rows[0]?.role === 'admin';
  } catch {
    return false;
  }
}

/** Returns a 401/403 NextResponse if not admin, otherwise null. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 });
  }
  return null;
}
