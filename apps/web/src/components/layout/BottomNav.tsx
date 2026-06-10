'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Map, Clock, History, User, LayoutDashboard, DollarSign, CreditCard } from '@/components/icons';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
}

const passengerNav: NavItem[] = [
  { href: '/app', icon: Map, label: 'Mapa' },
  { href: '/app/schedule', icon: Clock, label: 'Programar' },
  { href: '/app/history', icon: History, label: 'Historial' },
  { href: '/app/profile', icon: User, label: 'Perfil' },
];

const driverNav: NavItem[] = [
  { href: '/driver', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/driver/earnings', icon: DollarSign, label: 'Ganancias' },
  { href: '/driver/subscription', icon: CreditCard, label: 'Plan' },
  { href: '/driver/profile', icon: User, label: 'Perfil' },
];

interface BottomNavProps {
  role?: 'passenger' | 'driver';
}

export function BottomNav({ role = 'passenger' }: BottomNavProps) {
  const pathname = usePathname();
  const items = role === 'driver' ? driverNav : passengerNav;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 safe-bottom md:hidden">
        <div className="border-t border-[rgba(255,255,255,0.06)] bg-surface/95 px-2 pb-1 pt-2 backdrop-blur-xl">
          <div className="mx-auto flex max-w-md items-center justify-around">
            {items.map((item) => {
              const active = pathname === item.href || (item.href !== '/app' && item.href !== '/driver' && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 transition-colors">
                  <div className="relative">
                    <item.icon
                      size={22}
                      className={`transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
                    />
                    {active && (
                      <motion.div
                        layoutId="nav-dot"
                        className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary"
                      />
                    )}
                  </div>
                  <span className={`text-[10px] font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-20 flex-col items-center gap-3 border-r border-white/5 bg-surface/95 px-2 py-5 backdrop-blur-xl md:flex">
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-cta text-white">
          {role === 'driver' ? <LayoutDashboard size={21} /> : <Map size={21} />}
        </div>
        <nav className="flex w-full flex-1 flex-col items-center gap-2">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== '/app' && item.href !== '/driver' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[10px] font-medium transition-colors ${
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                }`}
              >
                <div className="relative flex h-6 items-center">
                  <item.icon
                    size={21}
                    className="transition-colors"
                  />
                  {active && (
                    <motion.div
                      layoutId="nav-rail-dot"
                      className="absolute -right-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary"
                    />
                  )}
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
