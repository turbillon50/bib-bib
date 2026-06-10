'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, btnCls } from '@/components/admin/ui';

type Ticket = {
  id: string;
  user_ref: string | null;
  message: string;
  screenshot: string | null;
  response: string | null;
  ts: string;
  status: string;
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch('/api/support', { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error cargando soporte');
        setTickets(data.tickets ?? []);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error cargando soporte'));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const patchTicket = async (ticket: Ticket, status: 'open' | 'resolved') => {
    setSaving(ticket.id);
    try {
      const response = responses[ticket.id]?.trim();
      const res = await fetch('/api/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ticket.id, status, response: response || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error actualizando ticket');
      setResponses((prev) => ({ ...prev, [ticket.id]: '' }));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando ticket');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Soporte</h1>
        <p className="text-sm text-muted-foreground">Reportes in-app de pasajeros, conductores y demo.</p>
      </div>

      {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p>}

      <div className="grid gap-3">
        {tickets.map((ticket) => (
          <article key={ticket.id} className="rounded-xl border border-white/5 bg-surface p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium">{ticket.user_ref || 'anonymous'}</div>
                <div className="text-xs text-muted-foreground">{new Date(ticket.ts).toLocaleString('es-MX')}</div>
              </div>
              <Badge value={ticket.status} />
            </div>

            <p className="whitespace-pre-wrap text-sm text-foreground">{ticket.message}</p>

            {ticket.screenshot && (
              <a href={ticket.screenshot} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-primary hover:underline">
                Ver screenshot
              </a>
            )}

            {ticket.response && (
              <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Respuesta: </span>
                {ticket.response}
              </div>
            )}

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <textarea
                value={responses[ticket.id] ?? ''}
                onChange={(event) => setResponses((prev) => ({ ...prev, [ticket.id]: event.target.value }))}
                rows={2}
                className="w-full resize-none rounded-xl border border-white/10 bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                placeholder="Respuesta al usuario..."
              />
              <div className="flex gap-2 md:flex-col">
                <button
                  onClick={() => patchTicket(ticket, ticket.status === 'resolved' ? 'resolved' : 'open')}
                  disabled={saving === ticket.id || !responses[ticket.id]?.trim()}
                  className={`${btnCls} bg-primary/15 px-4 py-2 text-primary hover:bg-primary/25 disabled:opacity-40`}
                >
                  Responder
                </button>
                <button
                  onClick={() => patchTicket(ticket, 'resolved')}
                  disabled={saving === ticket.id || ticket.status === 'resolved'}
                  className={`${btnCls} bg-emerald-500/15 px-4 py-2 text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-40`}
                >
                  Resolver
                </button>
              </div>
            </div>
          </article>
        ))}

        {!tickets.length && (
          <div className="rounded-xl border border-white/5 bg-surface p-8 text-center text-sm text-muted-foreground">
            Sin tickets de soporte.
          </div>
        )}
      </div>
    </div>
  );
}
