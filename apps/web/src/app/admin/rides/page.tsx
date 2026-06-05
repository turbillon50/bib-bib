'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, TableShell, Th, Td, Pager, inputCls, btnCls } from '@/components/admin/ui';

const STATUSES = ['', 'searching', 'negotiating', 'accepted', 'driver_en_route', 'arrived', 'in_progress', 'completed', 'canceled', 'expired', 'scheduled'];
const mxn = (v: any) => v == null ? '—' : `$${Number(v).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

export default function AdminRides() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  const load = useCallback(() => {
    const sp = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) sp.set('status', status);
    if (q) sp.set('q', q);
    if (from) sp.set('from', from);
    if (to) sp.set('to', to);
    fetch(`/api/admin/rides?${sp}`)
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setRows(j.rides); setTotal(j.total); setError(null); })
      .catch((e) => setError(e.message));
  }, [page, status, q, from, to]);

  useEffect(() => { load(); }, [load]);

  const cancelRide = async (id: string) => {
    if (!confirm('¿Cancelar este viaje?')) return;
    await fetch('/api/admin/rides', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'canceled', cancel_reason: 'Cancelado por admin' }) });
    load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Viajes</h1>
        <p className="text-sm text-muted-foreground">Historial y gestión de viajes</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input className={inputCls} placeholder="Buscar pasajero, dirección…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className={inputCls} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'Todos los estados'}</option>)}
        </select>
        <input type="date" className={inputCls} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        <input type="date" className={inputCls} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
      </div>

      {error && <p className="text-rose-400">Error: {error}</p>}

      <TableShell>
        <thead><tr><Th>Pasajero</Th><Th>Chofer</Th><Th>Ruta</Th><Th>Precio</Th><Th>Pago</Th><Th>Estado</Th><Th>Fecha</Th><Th>Acciones</Th></tr></thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-surface-2/50">
              <Td>
                <div>{r.passenger_name ?? '—'}</div>
                <div className="text-xs text-muted-foreground">{r.passenger_email}</div>
              </Td>
              <Td>{r.driver_name ?? '—'}</Td>
              <Td className="max-w-xs truncate text-muted-foreground">{r.origin_address} → {r.destination_address}</Td>
              <Td>{mxn(r.final_price ?? r.proposed_price)}</Td>
              <Td className="text-muted-foreground">{r.payment_method ?? '—'} · {r.payment_status}</Td>
              <Td><Badge value={r.status} /></Td>
              <Td className="text-muted-foreground">{new Date(r.created_at).toLocaleString('es-MX')}</Td>
              <Td>
                {!['completed', 'canceled', 'expired'].includes(r.status) && (
                  <button onClick={() => cancelRide(r.id)} className={`${btnCls} bg-rose-500/15 text-rose-400 hover:bg-rose-500/25`}>Cancelar</button>
                )}
              </Td>
            </tr>
          ))}
          {!rows.length && <tr><Td className="text-muted-foreground">Sin resultados</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td></tr>}
        </tbody>
      </TableShell>

      <Pager page={page} total={total} limit={limit} onPage={setPage} />
    </div>
  );
}
