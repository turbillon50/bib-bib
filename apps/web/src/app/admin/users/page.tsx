'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, TableShell, Th, Td, Pager, inputCls, btnCls } from '@/components/admin/ui';

export default function AdminUsers() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [blocked, setBlocked] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  const load = useCallback(() => {
    const sp = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (role) sp.set('role', role);
    if (blocked) sp.set('blocked', blocked);
    if (q) sp.set('q', q);
    fetch(`/api/admin/users?${sp}`)
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setRows(j.users); setTotal(j.total); setError(null); })
      .catch((e) => setError(e.message));
  }, [page, role, blocked, q]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: string, extra?: object) => {
    await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, ...extra }) });
    load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-sm text-muted-foreground">Gestión de cuentas y roles</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input className={inputCls} placeholder="Buscar nombre, email, teléfono…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className={inputCls} value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">Todos los roles</option><option value="passenger">Pasajeros</option><option value="driver">Choferes</option><option value="admin">Admins</option>
        </select>
        <select className={inputCls} value={blocked} onChange={(e) => { setBlocked(e.target.value); setPage(1); }}>
          <option value="">Todos</option><option value="true">Bloqueados</option><option value="false">Activos</option>
        </select>
      </div>

      {error && <p className="text-rose-400">Error: {error}</p>}

      <TableShell>
        <thead><tr><Th>Usuario</Th><Th>Rol</Th><Th>Viajes</Th><Th>Registro</Th><Th>Última actividad</Th><Th>Acciones</Th></tr></thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((u) => (
            <tr key={u.id} className="hover:bg-surface-2/50">
              <Td>
                <div>{u.name} {u.is_blocked && <Badge value="rejected" />}</div>
                <div className="text-xs text-muted-foreground">{u.email} · {u.phone}</div>
              </Td>
              <Td>
                <select
                  className="rounded-lg border border-white/10 bg-surface-2 px-2 py-1 text-xs"
                  value={u.role}
                  onChange={(e) => act(u.id, 'set_role', { role: e.target.value })}
                >
                  <option value="passenger">passenger</option><option value="driver">driver</option><option value="admin">admin</option>
                </select>
              </Td>
              <Td>{u.total_rides}</Td>
              <Td className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString('es-MX')}</Td>
              <Td className="text-muted-foreground">{u.last_seen_at ? new Date(u.last_seen_at).toLocaleString('es-MX') : '—'}</Td>
              <Td>
                <button onClick={() => act(u.id, 'toggle_block')} className={`${btnCls} bg-rose-500/15 text-rose-400 hover:bg-rose-500/25`}>
                  {u.is_blocked ? 'Desbloquear' : 'Bloquear'}
                </button>
              </Td>
            </tr>
          ))}
          {!rows.length && <tr><Td className="text-muted-foreground">Sin resultados</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td></tr>}
        </tbody>
      </TableShell>

      <Pager page={page} total={total} limit={limit} onPage={setPage} />
    </div>
  );
}
