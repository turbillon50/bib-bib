'use client';

import { ReactNode, useEffect } from 'react';

export type BrandingConfig = {
  app_name: string;
  primary_color: string;
  accent_color: string;
  logo_url: string;
  icon_url: string;
  theme: 'dark' | 'light';
};

const DEFAULT_BRANDING: BrandingConfig = {
  app_name: 'Bib-Bib',
  primary_color: '#e85d04',
  accent_color: '#f4a100',
  logo_url: '/brand/hero.jpg',
  icon_url: '/brand/icon-192.png',
  theme: 'dark',
};

function readCookie(name: string) {
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.split('=')[1];
}

export function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme === 'light');
  localStorage.setItem('bib-bib_theme', theme);
  document.cookie = `bib-bib_theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}

export function applyBranding(branding: BrandingConfig) {
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', branding.primary_color);
  root.style.setProperty('--brand-accent', branding.accent_color);
  root.style.setProperty('--accent', branding.primary_color);
  root.style.setProperty('--secondary', branding.accent_color);
  root.style.setProperty('--gradient-cta', `linear-gradient(135deg, ${branding.primary_color}, ${branding.accent_color})`);

  document.title = branding.app_name || DEFAULT_BRANDING.app_name;

  const iconHref = branding.icon_url || DEFAULT_BRANDING.icon_url;
  let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!icon) {
    icon = document.createElement('link');
    icon.rel = 'icon';
    document.head.appendChild(icon);
  }
  icon.href = iconHref;

  let apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (!apple) {
    apple = document.createElement('link');
    apple.rel = 'apple-touch-icon';
    document.head.appendChild(apple);
  }
  apple.href = iconHref;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const savedTheme = localStorage.getItem('bib-bib_theme') || readCookie('bib-bib_theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      applyTheme(savedTheme);
    }

    let cancelled = false;
    fetch('/api/branding', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const branding = { ...DEFAULT_BRANDING, ...(data.branding ?? {}) } as BrandingConfig;
        applyBranding(branding);
        const preferred = localStorage.getItem('bib-bib_theme') || readCookie('bib-bib_theme') || branding.theme;
        applyTheme(preferred === 'light' ? 'light' : 'dark');
      })
      .catch(() => {
        if (!cancelled) applyBranding(DEFAULT_BRANDING);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children}</>;
}
