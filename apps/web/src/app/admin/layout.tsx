import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isAdmin } from '@/lib/admin-auth';
import { LayoutDashboard, Car, Users, Route, Mail, MessageCircle, Settings } from '@/components/icons';
import { SupportButton } from '@/components/SupportButton';
import { ThemeToggle } from '@/components/ThemeToggle';

export const dynamic = 'force-dynamic';

const nav = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/rides', label: 'Viajes', icon: Route },
  { href: '/admin/drivers', label: 'Choferes', icon: Car },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
  { href: '/admin/invitations', label: 'Invitaciones', icon: Mail },
  { href: '/admin/support', label: 'Soporte', icon: MessageCircle },
  { href: '/admin/branding', label: 'Personalizacion', icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await isAdmin();
  if (!admin) redirect('/');

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="hidden w-64 shrink-0 flex-col gap-1 border-r border-white/5 bg-surface p-4 md:flex">
        <div className="px-3 py-4">
          <span className="text-lg font-bold text-primary">RideMe</span>
          <span className="ml-2 text-xs uppercase tracking-widest text-muted-foreground">Admin</span>
        </div>
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors"
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
        <div className="mt-auto px-3 py-3">
          <ThemeToggle />
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="flex gap-2 overflow-x-auto border-b border-white/5 bg-surface px-4 py-3 md:hidden">
          {nav.map(({ href, label }) => (
            <Link key={href} href={href} className="text-sm text-muted-foreground whitespace-nowrap px-2 py-1 rounded hover:bg-surface-2">
              {label}
            </Link>
          ))}
          <ThemeToggle className="h-8 w-8 shrink-0" />
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
      <SupportButton />
    </div>
  );
}
