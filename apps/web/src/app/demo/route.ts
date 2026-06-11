import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function safeRedirectTarget(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/app';
  return value;
}

export function GET(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO !== '1') {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }
  const to = safeRedirectTarget(req.nextUrl.searchParams.get('to'));
  const res = NextResponse.redirect(new URL(to, req.url));

  res.cookies.set('rideme_demo', '1', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  return res;
}
