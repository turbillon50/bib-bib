import './globals.css';
import { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { Providers } from './providers';

export const metadata = {
  title: 'RideMe – Name Your Price',
  description: 'Premium rideshare app where you set the price. No surge. No guessing.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#6C63FF',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <head>
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="RideMe" />
          <meta name="theme-color" content="#6C63FF" />
          <link rel="manifest" href="/manifest.json" />
          <link rel="icon" href="/brand/icon-192.png" />
          <link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />
        </head>
        <body className="min-h-screen bg-background text-foreground">
          <Providers>
            {children}
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
