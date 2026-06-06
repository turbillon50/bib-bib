import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAdmin } from '@/lib/admin-auth';
import { currentUser } from '@clerk/nextjs/server';

// Owner de arranque: puede inicializar la DB aunque su rol aún no exista en la tabla.
const BOOTSTRAP_OWNERS = (process.env.ADMIN_EMAILS || 'turbillon50@gmail.com')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

export const dynamic = 'force-dynamic';

// POST /api/admin/db-init  — crea tabla invitations, relaja columnas para usuarios Clerk,
// agrega rol 'owner' y promueve a los ADMIN_EMAILS. Idempotente.
// Autorización: admin/owner (ADMIN_EMAILS funciona sin DB) o header x-migration-secret.
export async function POST(req: NextRequest) {
  const secret = process.env.MIGRATION_SECRET;
  const provided = req.headers.get('x-migration-secret');
  const bySecret = !!secret && provided === secret;

  let byBootstrap = false;
  try {
    const cu = await currentUser();
    const email = (cu?.emailAddresses?.[0]?.emailAddress ?? '').toLowerCase();
    byBootstrap = !!email && BOOTSTRAP_OWNERS.includes(email);
  } catch { /* ignore */ }

  if (!bySecret && !byBootstrap && !(await isAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const sql = getDb();
  const steps: string[] = [];
  const run = async (label: string, q: string) => {
    try { await sql.query(q, []); steps.push(`ok: ${label}`); }
    catch (e: any) { steps.push(`warn: ${label}: ${e?.message ?? e}`); }
  };

  // 'owner' role value (autocommit en Neon HTTP)
  await run("add role 'owner'", `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner'`);
  // columnas opcionales para usuarios gestionados por Clerk
  await run('phone nullable', `ALTER TABLE users ALTER COLUMN phone DROP NOT NULL`);
  await run('password_hash nullable', `ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`);
  await run('clerk_id column', `ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id VARCHAR(255) UNIQUE`);
  // tabla invitations
  await run('invitations table', `
    CREATE TABLE IF NOT EXISTS invitations (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code        VARCHAR(16) UNIQUE NOT NULL,
      role        user_role NOT NULL,
      email       VARCHAR(255),
      label       VARCHAR(255),
      invited_by  UUID REFERENCES users(id),
      used_by     UUID REFERENCES users(id),
      used_at     TIMESTAMPTZ,
      expires_at  TIMESTAMPTZ,
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await run('idx code', `CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code)`);
  await run('idx email', `CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email)`);
  await run('idx invited_by', `CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON invitations(invited_by)`);

  // Promover ADMIN_EMAILS a owner (si ya existen en la tabla)
  const owners = Array.from(new Set([
    ...(process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
    ...BOOTSTRAP_OWNERS,
  ]));
  let promoted = 0;
  for (const em of owners) {
    try {
      const r = (await sql.query(
        `UPDATE users SET role = 'owner'::user_role, updated_at = NOW() WHERE LOWER(email) = $1 RETURNING id`,
        [em]
      )) as any[];
      promoted += r.length;
    } catch { /* ignore */ }
  }

  return NextResponse.json({ ok: true, steps, ownersConfigured: owners, ownersPromoted: promoted });
}
