import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
// Clerk solo se activa con una llave real; si no, la app corre en modo demo abierto.
const clerkEnabled = /^pk_(test|live)_/.test(pk) && !/placeholder|REPLACE|xxx|^pk_test_demo$/i.test(pk);

const isPublicRoute = createRouteMatcher([
  '/', '/demo(.*)', '/sign-in(.*)', '/sign-up(.*)', '/invite(.*)',
  '/api/webhooks(.*)', '/api/health', '/api/branding(.*)', '/api/support(.*)', '/api/invitations/validate',
]);

const clerkHandler = clerkMiddleware((auth, req) => {
  if (process.env.NEXT_PUBLIC_DEMO === '1' && req.cookies.get('rideme_demo')?.value === '1') return;
  if (!isPublicRoute(req)) auth().protect();
});

export default function middleware(req: NextRequest, ev: any) {
  if (!clerkEnabled) return NextResponse.next();
  return (clerkHandler as any)(req, ev);
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
