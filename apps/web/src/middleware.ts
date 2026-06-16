import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const clerkEnabled = /^pk_(test|live)_/.test(pk) && !/placeholder|REPLACE|xxx|^pk_test_demo$/i.test(pk);

const isPublicRoute = createRouteMatcher([
  '/',
  '/demo(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/invite(.*)',
  '/login', '/login/(.*)', '/register', '/register/(.*)', '/app', '/app/(.*)', '/driver', '/driver/(.*)',
  '/login/(.*)',
  '/register',
  '/register/(.*)',
  '/api/webhooks(.*)',
  '/api/health',
  '/api/auth(.*)',
  '/api/branding(.*)',
  '/api/support(.*)',
  '/api/invitations/validate',
]);

const clerkHandler = clerkMiddleware((auth, req) => {
  if (process.env.NEXT_PUBLIC_DEMO === '1' && req.cookies.get('bib-bib_demo')?.value === '1') return;
  if (!isPublicRoute(req)) {
    auth().protect({ unauthenticatedUrl: new URL('/login', '/login/(.*)', '/register', '/register/(.*)', '/app', '/app/(.*)', '/driver', '/driver/(.*)', req.url).toString() });
  }
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
