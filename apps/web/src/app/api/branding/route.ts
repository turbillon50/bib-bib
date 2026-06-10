import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-auth';
import { getSupportDb } from '@/lib/support-db';

export const dynamic = 'force-dynamic';

type Branding = {
  project: string;
  app_name: string;
  primary_color: string;
  accent_color: string;
  logo_url: string;
  icon_url: string;
  theme: 'dark' | 'light';
  updated_at?: string;
};

const DEFAULT_BRANDING: Branding = {
  project: 'rideme',
  app_name: 'RideMe',
  primary_color: '#6C63FF',
  accent_color: '#00D4AA',
  logo_url: '/brand/hero.jpg',
  icon_url: '/brand/icon-192.png',
  theme: 'dark',
};

function validColor(value: unknown, fallback: string) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function validPath(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('/') || /^https?:\/\//.test(trimmed)) return trimmed.slice(0, 1000);
  return fallback;
}

async function ensureBrandingSchema() {
  const sql = getSupportDb();
  await sql.query(
    `CREATE TABLE IF NOT EXISTS app_branding (
      project TEXT PRIMARY KEY,
      app_name TEXT NOT NULL,
      primary_color TEXT NOT NULL,
      accent_color TEXT NOT NULL,
      logo_url TEXT,
      icon_url TEXT,
      theme TEXT NOT NULL DEFAULT 'dark',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    []
  );
  return sql;
}

export async function GET() {
  try {
    const sql = await ensureBrandingSchema();
    const rows = (await sql.query(
      `SELECT project, app_name, primary_color, accent_color, logo_url, icon_url, theme, updated_at
       FROM app_branding
       WHERE project = $1`,
      ['rideme']
    )) as Branding[];

    return NextResponse.json({ branding: rows[0] ?? DEFAULT_BRANDING });
  } catch {
    return NextResponse.json({ branding: DEFAULT_BRANDING });
  }
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const nextBranding: Branding = {
      project: 'rideme',
      app_name: typeof body.app_name === 'string' && body.app_name.trim() ? body.app_name.trim().slice(0, 80) : DEFAULT_BRANDING.app_name,
      primary_color: validColor(body.primary_color, DEFAULT_BRANDING.primary_color),
      accent_color: validColor(body.accent_color, DEFAULT_BRANDING.accent_color),
      logo_url: validPath(body.logo_url, DEFAULT_BRANDING.logo_url),
      icon_url: validPath(body.icon_url, DEFAULT_BRANDING.icon_url),
      theme: body.theme === 'light' ? 'light' : 'dark',
    };

    const sql = await ensureBrandingSchema();
    const rows = (await sql.query(
      `INSERT INTO app_branding (project, app_name, primary_color, accent_color, logo_url, icon_url, theme, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (project) DO UPDATE SET
         app_name = EXCLUDED.app_name,
         primary_color = EXCLUDED.primary_color,
         accent_color = EXCLUDED.accent_color,
         logo_url = EXCLUDED.logo_url,
         icon_url = EXCLUDED.icon_url,
         theme = EXCLUDED.theme,
         updated_at = NOW()
       RETURNING project, app_name, primary_color, accent_color, logo_url, icon_url, theme, updated_at`,
      [
        nextBranding.project,
        nextBranding.app_name,
        nextBranding.primary_color,
        nextBranding.accent_color,
        nextBranding.logo_url,
        nextBranding.icon_url,
        nextBranding.theme,
      ]
    )) as Branding[];

    return NextResponse.json({ branding: rows[0] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error guardando branding' },
      { status: 500 }
    );
  }
}
