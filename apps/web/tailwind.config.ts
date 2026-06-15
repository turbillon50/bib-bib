import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--bg)',
        foreground: 'var(--text-primary)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        card: { DEFAULT: 'var(--surface)', foreground: 'var(--text-primary)' },
        muted: { DEFAULT: 'var(--surface-2)', foreground: 'var(--text-secondary)' },
        primary: { DEFAULT: '#e85d04', foreground: '#FFFFFF' },
        accent: '#e85d04',
        'accent-hover': '#c94e03',
        secondary: { DEFAULT: '#f4a100', foreground: '#0f0500', hover: '#d48e00' },
        'secondary-hover': '#d48e00',
        ring: '#e85d04',
        border: 'var(--border)',
        input: 'var(--surface-2)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        success: '#22C55E',
        warning: '#f4a100',
        error: '#EF4444',
        info: '#e85d04',
        orange: {
          400: '#fb923c',
          500: '#f97316',
          600: '#e85d04',
          700: '#c94e03',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: { '2xs': ['0.625rem', { lineHeight: '0.75rem' }] },
      backgroundImage: {
        'gradient-cta': 'var(--gradient-cta)',
        'gradient-card': 'linear-gradient(145deg, rgba(232,93,4,0.12), rgba(244,161,0,0.08))',
        'gradient-dark': 'linear-gradient(180deg, var(--bg) 0%, var(--surface) 100%)',
        'gradient-hero': 'radial-gradient(ellipse at top, rgba(232,93,4,0.18) 0%, transparent 60%)',
      },
      boxShadow: {
        'glow-accent': '0 0 20px rgba(232,93,4,0.45)',
        'glow-secondary': '0 0 20px rgba(244,161,0,0.45)',
        'glow-success': '0 0 20px rgba(34,197,94,0.4)',
        'card': '0 4px 24px rgba(0,0,0,0.5)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.65)',
        'modal': '0 25px 80px rgba(0,0,0,0.85)',
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem', '4xl': '2rem' },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
      },
      keyframes: {
        shimmer: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(100%)' } },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(232,93,4,0.4), 0 0 20px rgba(232,93,4,0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(232,93,4,0.7), 0 0 40px rgba(232,93,4,0.4)' },
        },
        float: { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-10px)' } },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },
      spacing: { '18': '4.5rem', '22': '5.5rem', '30': '7.5rem' },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};

export default config;
