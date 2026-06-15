'use client';

import { clsx } from 'clsx';

export function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={clsx('rounded-xl border border-white/5 bg-surface p-4', accent && 'border-primary/40')}>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={clsx('mt-1 text-2xl font-bold', accent ? 'text-primary' : 'text-foreground')}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-emerald-500/15 text-emerald-400',
  in_progress: 'bg-sky-500/15 text-sky-400',
  accepted: 'bg-sky-500/15 text-sky-400',
  driver_en_route: 'bg-sky-500/15 text-sky-400',
  arrived: 'bg-sky-500/15 text-sky-400',
  searching: 'bg-amber-500/15 text-amber-400',
  negotiating: 'bg-amber-500/15 text-amber-400',
  scheduled: 'bg-orange-500/15 text-orange-400',
  canceled: 'bg-rose-500/15 text-rose-400',
  expired: 'bg-zinc-500/15 text-zinc-400',
  approved: 'bg-emerald-500/15 text-emerald-400',
  pending: 'bg-amber-500/15 text-amber-400',
  rejected: 'bg-rose-500/15 text-rose-400',
  active: 'bg-emerald-500/15 text-emerald-400',
  inactive: 'bg-zinc-500/15 text-zinc-400',
  open: 'bg-amber-500/15 text-amber-400',
  resolved: 'bg-emerald-500/15 text-emerald-400',
  admin: 'bg-primary/15 text-primary',
  driver: 'bg-sky-500/15 text-sky-400',
  passenger: 'bg-zinc-500/15 text-zinc-300',
};

export function Badge({ value }: { value: string }) {
  return (
    <span className={clsx('inline-block rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLES[value] ?? 'bg-zinc-500/15 text-zinc-300')}>
      {value}
    </span>
  );
}

export function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</th>;
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={clsx('px-3 py-2.5 text-sm', className)}>{children}</td>;
}

export function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/5 bg-surface">
      <table className="min-w-full divide-y divide-white/5">{children}</table>
    </div>
  );
}

export function Pager({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="flex items-center justify-between py-3 text-sm text-muted-foreground">
      <span>{total} registros · página {page} de {pages}</span>
      <div className="flex gap-2">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40 hover:bg-surface-2">Anterior</button>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40 hover:bg-surface-2">Siguiente</button>
      </div>
    </div>
  );
}

export const inputCls = 'rounded-lg border border-white/10 bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none';
export const btnCls = 'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors';
