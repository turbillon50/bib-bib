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
        primary: { DEFAULT: 'var(--brand-primary)', foreground: '#FFFFFF' },
        accent: 'var(--brand-primary)',
        'accent-hover': 'var(--accent-hover)',
        secondary: { DEFAULT: 'var(--brand-accent)', foreground: '#0A0A0F', hover: 'var(--secondary-hover)' },
        'secondary-hover': 'var(--secondary-hover)',
        ring: 'var(--brand-primary)',
        border: 'var(--border)',
        input: 'var(--surface-2)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      backgroundImage: {
        'gradient-cta': 'var(--gradient-cta)',
        'gradient-card': 'linear-gradient(145deg, color-mix(in srgb, var(--brand-primary) 12%, transparent), color-mix(in srgb, var(--brand-accent) 8%, transparent))',
        'gradient-dark': 'linear-gradient(180deg, var(--bg) 0%, var(--surface) 100%)',
        'gradient-hero': 'radial-gradient(ellipse at top, color-mix(in srgb, var(--brand-primary) 18%, transparent) 0%, transparent 60%)',
      },
      boxShadow: {
        'glow-accent': '0 0 20px rgba(108,99,255,0.4)',
        'glow-secondary': '0 0 20px rgba(0,212,170,0.4)',
        'glow-success': '0 0 20px rgba(34,197,94,0.4)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.6)',
        'modal': '0 25px 80px rgba(0,0,0,0.8)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'count-up': 'countUp 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(34,197,94,0.4), 0 0 20px rgba(34,197,94,0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(34,197,94,0.7), 0 0 40px rgba(34,197,94,0.4)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
