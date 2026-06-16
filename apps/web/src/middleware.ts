import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const clerkEnabled = /^pk_(test|live)_/.test(pk) && !/placeholder|REPLACE|xxx|^pk_test_demo$/i.test(pk);

// Navegacion libre — solo /admin y /checkout requieren auth
const isPublicRoute = createRouteMatcher([
  '(.*)',
]);

const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/checkout(.*)',
]);

const clerkHandler = clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    auth().protect({ unauthenticatedUrl: new URL('/login', req.url).toString() });
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
