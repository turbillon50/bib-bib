import './globals.css';
import { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { Providers } from './providers';

export const metadata = {
  title: 'Bib-Bib — Servicio a Domicilio',
  description: 'Mandaditos rapidos a tu puerta. Tu pones el precio.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#e85d04',
};

const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const clerkOk = /^pk_(test|live)_/.test(pk) && !/placeholder|xxx/i.test(pk);

export default function RootLayout({ children }: { children: ReactNode }) {
  const tree = (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Bib-Bib" />
        <meta name="theme-color" content="#e85d04" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/brand/icon-192.png" />
        <link rel="apple-touch-icon" href="/brand/icon-192.png" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#0f0500', color: '#fff8f0', fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100dvh' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
  return clerkOk ? <ClerkProvider>{tree}</ClerkProvider> : tree;
}
