'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const LOGO_B64_KEY = '/brand/logo.jpg';

const passengerNav = [
  {
    href: '/app',
    label: 'Inicio',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/app/trip',
    label: 'Mi pedido',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    href: '/app/history',
    label: 'Historial',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    href: '/app/profile',
    label: 'Mi cuenta',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

const driverNav = [
  {
    href: '/driver',
    label: 'Panel',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    href: '/driver/earnings',
    label: 'Ganancias',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
  {
    href: '/driver/subscription',
    label: 'Mi plan',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
  {
    href: '/driver/profile',
    label: 'Mi cuenta',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

interface BottomNavProps {
  role?: 'passenger' | 'driver';
}

export function BottomNav({ role = 'passenger' }: BottomNavProps) {
  const pathname = usePathname();
  const items = role === 'driver' ? driverNav : passengerNav;

  return (
    <>
      {/* Mobile bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }} className="md:hidden">
        <div style={{
          borderTop: '1px solid rgba(232,93,4,0.18)',
          background: 'rgba(15,5,0,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          padding: '8px 4px 4px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', maxWidth: 430, margin: '0 auto' }}>
            {items.map((item) => {
              const active = pathname === item.href || (item.href.length > 6 && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <motion.div
                    whileTap={{ scale: 0.92 }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 4, padding: '6px 16px', borderRadius: 12, minHeight: 56,
                      color: active ? '#e85d04' : 'rgba(255,220,180,0.45)',
                      transition: 'color 150ms',
                    }}
                  >
                    {item.icon}
                    <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{item.label}</span>
                    {active && (
                      <motion.div
                        layoutId="nav-dot"
                        style={{
                          width: 4, height: 4, borderRadius: 2,
                          background: '#e85d04', marginTop: -2,
                        }}
                      />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop rail */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40,
        width: 72, display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 8, padding: '16px 8px',
        background: 'rgba(15,5,0,0.97)',
        borderRight: '1px solid rgba(232,93,4,0.12)',
        backdropFilter: 'blur(24px)',
      }} className="hidden md:flex">
        <div style={{
          width: 40, height: 40, borderRadius: 12, overflow: 'hidden',
          marginBottom: 8, flexShrink: 0,
        }}>
          <img src="/brand/logo.jpg" alt="Bib-Bib" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        {items.map((item) => {
          const active = pathname === item.href || (item.href.length > 6 && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} title={item.label} style={{ textDecoration: 'none', width: '100%' }}>
              <motion.div
                whileTap={{ scale: 0.95 }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 4, padding: '10px 4px', borderRadius: 12,
                  color: active ? '#e85d04' : 'rgba(255,220,180,0.4)',
                  background: active ? 'rgba(232,93,4,0.12)' : 'transparent',
                  transition: 'all 150ms',
                }}
              >
                {item.icon}
                <span style={{ fontSize: 9, fontWeight: 600 }}>{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </aside>
    </>
  );
}
