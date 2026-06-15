import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  let db = 'unknown';
  let invitations = false;
  try {
    const sql = getDb();
    await sql.query('SELECT 1', []);
    db = 'ok';
    const r = (await sql.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='invitations') AS ok`, []
    )) as any[];
    invitations = !!r[0]?.ok;
  } catch (e: any) {
    db = `error: ${e?.message ?? 'unknown'}`;
  }
  return NextResponse.json({ status: 'ok', service: 'bib-bib-web', time: new Date().toISOString(), db, invitations });
}
