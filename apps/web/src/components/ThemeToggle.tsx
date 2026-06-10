'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from '@/components/icons';
import { applyTheme } from '@/components/BrandingProvider';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const current = document.documentElement.classList.contains('light') ? 'light' : 'dark';
    setTheme(current);
  }, []);

  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      title={nextTheme === 'light' ? 'Modo dia' : 'Modo noche'}
      aria-label={nextTheme === 'light' ? 'Activar modo dia' : 'Activar modo noche'}
      onClick={() => {
        applyTheme(nextTheme);
        setTheme(nextTheme);
      }}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-surface/90 text-foreground shadow-card backdrop-blur transition hover:border-primary/40 ${className}`}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
