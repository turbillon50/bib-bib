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
    <div className="fixed bottom-0 left-0 right-0 z-40 safe-bottom">
      <div className="bg-[rgba(17,17,24,0.95)] backdrop-blur-xl border-t border-[rgba(255,255,255,0.06)] px-2 pb-1 pt-2">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== '/app' && item.href !== '/driver' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors">
                <div className="relative">
                  <item.icon
                    size={22}
                    className={`transition-colors ${active ? 'text-[#6C63FF]' : 'text-[#4A4A5A]'}`}
                  />
                  {active && (
                    <motion.div
                      layoutId="nav-dot"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#6C63FF]"
                    />
                  )}
                </div>
                <span className={`text-[10px] font-medium transition-colors ${active ? 'text-[#6C63FF]' : 'text-[#4A4A5A]'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
