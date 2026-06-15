import './globals.css';
import { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { Providers } from './providers';

export const metadata = {
  title: 'Bib-Bib – Name Your Price',
  description: 'Premium rideshare app where you set the price. No surge. No guessing.',
};

export const viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1, viewportFit: 'cover', themeColor: '#6C63FF',
};

const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const clerkEnabled = /^pk_(test|live)_/.test(pk) && !/placeholder|REPLACE|xxx|^pk_test_demo$/i.test(pk);

export default function RootLayout({ children }: { children: ReactNode }) {
  const tree = (
    <html lang="en" className="dark">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Bib-Bib" />
        <meta name="theme-color" content="#6C63FF" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/brand/icon-192.png" />
        <link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
  return clerkEnabled ? <ClerkProvider>{tree}</ClerkProvider> : tree;
}
