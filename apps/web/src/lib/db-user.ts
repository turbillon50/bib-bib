import { auth, currentUser } from '@clerk/nextjs/server';
import { getDb } from './db';
import type { AppRole } from './invitations';

export interface DbUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  clerk_id: string | null;
  is_active: boolean;
  is_blocked: boolean;
}

function ownerEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Returns the current Clerk user's row in `users`, creating it on first sight.
 * Owner emails (ADMIN_EMAILS) are promoted to role 'owner'.
 */
export async function getOrCreateDbUser(): Promise<DbUser | null> {
  const { userId } = auth();
  if (!userId) return null;

  const cu = await currentUser();
  const email = (cu?.emailAddresses?.[0]?.emailAddress ?? '').toLowerCase();
  const name =
    [cu?.firstName, cu?.lastName].filter(Boolean).join(' ').trim() ||
    cu?.username ||
    email.split('@')[0] ||
    'Usuario';

  const sql = getDb();
  const isOwner = !!email && ownerEmails().includes(email);

  // Try to find existing by clerk_id or email
  let rows = (await sql.query(
    `SELECT id, email, name, role, clerk_id, is_active, is_blocked
       FROM users WHERE clerk_id = $1 OR LOWER(email) = $2 LIMIT 1`,
    [userId, email]
  )) as DbUser[];

  if (rows.length) {
    const u = rows[0];
    // Keep clerk_id in sync; promote owner if needed.
    if (u.clerk_id !== userId || (isOwner && u.role !== 'owner')) {
      const newRole = isOwner ? 'owner' : u.role;
      rows = (await sql.query(
        `UPDATE users SET clerk_id = $1, role = $3::user_role, updated_at = NOW()
           WHERE id = $2
         RETURNING id, email, name, role, clerk_id, is_active, is_blocked`,
        [userId, u.id, newRole]
      )) as DbUser[];
    }
    return rows[0];
  }

  // Create new user (Clerk-managed; phone/password are optional after mig 003)
  const role: AppRole = isOwner ? 'owner' : 'passenger';
  rows = (await sql.query(
    `INSERT INTO users (clerk_id, email, name, role, is_active)
       VALUES ($1, $2, $3, $4::user_role, true)
     RETURNING id, email, name, role, clerk_id, is_active, is_blocked`,
    [userId, email || `${userId}@clerk.local`, name, role]
  )) as DbUser[];
  return rows[0] ?? null;
}
