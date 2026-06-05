'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, TableShell, Th, Td, Pager, inputCls, btnCls } from '@/components/admin/ui';

export default function AdminDrivers() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [online, setOnline] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  const load = useCallback(() => {
    const sp = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) sp.set('status', status);
    if (online) sp.set('online', online);
    if (q) sp.set('q', q);
    fetch(`/api/admin/drivers?${sp}`)
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setRows(j.drivers); setTotal(j.total); setError(null); })
      .catch((e) => setError(e.message));
  }, [page, status, online, q]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: string) => {
    await fetch('/api/admin/drivers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
    load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Choferes</h1>
        <p className="text-sm text-muted-foreground">Aprobación y gestión de choferes</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input className={inputCls} placeholder="Buscar nombre, email, licencia…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className={inputCls} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Todos</option><option value="pending">Pendientes</option><option value="approved">Aprobados</option><option value="rejected">Rechazados</option>
        </select>
        <select className={inputCls} value={online} onChange={(e) => { setOnline(e.target.value); setPage(1); }}>
          <option value="">En línea: todos</option><option value="true">En línea</option><option value="false">Desconectados</option>
        </select>
      </div>

      {error && <p className="text-rose-400">Error: {error}</p>}

      <TableShell>
        <thead><tr><Th>Chofer</Th><Th>Vehículo</Th><Th>Licencia</Th><Th>Rating</Th><Th>Viajes</Th><Th>Estado</Th><Th>En línea</Th><Th>Acciones</Th></tr></thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((d) => (
            <tr key={d.id} className="hover:bg-surface-2/50">
              <Td>
                <div>{d.name} {d.is_blocked && <Badge value="rejected" />}</div>
                <div className="text-xs text-muted-foreground">{d.email} · {d.phone}</div>
              </Td>
              <Td className="text-muted-foreground">{d.make ? `${d.make} ${d.model} · ${d.plate_number}` : '—'}</Td>
              <Td className="text-muted-foreground">{d.license_number}</Td>
              <Td>⭐ {Number(d.rating_average).toFixed(2)} ({d.rating_count})</Td>
              <Td>{d.total_trips}</Td>
              <Td><Badge value={d.approval_status} /></Td>
              <Td>{d.is_online ? <span className="text-emerald-400">● en línea</span> : <span className="text-muted-foreground">○</span>}</Td>
              <Td>
                <div className="flex flex-wrap gap-1.5">
                  {d.approval_status !== 'approved' && (
                    <button onClick={() => act(d.id, 'approve')} className={`${btnCls} bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25`}>Aprobar</button>
                  )}
                  {d.approval_status !== 'rejected' && (
                    <button onClick={() => act(d.id, 'reject')} className={`${btnCls} bg-amber-500/15 text-amber-400 hover:bg-amber-500/25`}>Rechazar</button>
                  )}
                  <button onClick={() => act(d.id, 'toggle_block')} className={`${btnCls} bg-rose-500/15 text-rose-400 hover:bg-rose-500/25`}>
                    {d.is_blocked ? 'Desbloquear' : 'Bloquear'}
                  </button>
                </div>
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
