'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, TableShell, Th, Td, inputCls, btnCls } from '@/components/admin/ui';

const ROLE_LABELS: Record<string, string> = { owner: 'Dueño', admin: 'Administrador', driver: 'Chofer', passenger: 'Usuario' };

export default function AdminInvitations() {
  const [rows, setRows] = useState<any[]>([]);
  const [allowed, setAllowed] = useState<{ value: string; label: string }[]>([]);
  const [me, setMe] = useState<any>(null);
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [needsInit, setNeedsInit] = useState(false);
  const [initing, setIniting] = useState(false);

  const load = useCallback(() => {
    fetch('/api/invitations')
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); 
        setRows(j.invitations); setAllowed(j.allowedRoles); setMe(j.me);
        if (!role && j.allowedRoles[0]) setRole(j.allowedRoles[0].value); setError(null); })
      .catch((e) => {
        setError(e.message);
        if (/inicializ|no existe|invitations|relation|42P01|tabla/i.test(e.message || '')) setNeedsInit(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initDb = async () => {
    setIniting(true); setError(null);
    try {
      const r = await fetch('/api/admin/db-init', { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'No autorizado');
      setNeedsInit(false);
      setMsg('Base de datos inicializada. Ya puedes invitar.');
      load();
    } catch (e: any) { setError(e.message); }
    finally { setIniting(false); }
  };

  useEffect(() => {
    fetch('/api/health').then((r) => r.json()).then((h) => { if (h && h.invitations === false) setNeedsInit(true); }).catch(() => {});
    load();
  }, [load]);

  const create = async () => {
    if (creating || !role) return;
    setCreating(true); setMsg(null);
    try {
      const r = await fetch('/api/invitations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, email: email.trim() || undefined, label: label.trim() || undefined }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setEmail(''); setLabel('');
      const sent = j.email ? (j.email.sent ? ' · email enviado' : ` · email NO enviado (${j.email.reason})`) : '';
      setMsg(`Invitación creada: ${j.invitation.code}${sent}`);
      load();
    } catch (e: any) { setMsg(null); setError(e.message); }
    finally { setCreating(false); }
  };

  const revoke = async (id: string) => {
    if (!confirm('¿Revocar esta invitación? Si ya fue usada, el invitado pierde acceso.')) return;
    await fetch(`/api/invitations/${id}`, { method: 'DELETE' });
    load();
  };

  const copy = (link: string, id: string) => {
    navigator.clipboard?.writeText(link).then(() => { setCopied(id); setTimeout(() => setCopied(null), 1800); }).catch(() => {});
  };

  const active = rows.filter((r) => r.is_active && !r.used_by);
  const used = rows.filter((r) => r.used_by || !r.is_active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invitaciones</h1>
        <p className="text-sm text-muted-foreground">
          {me ? `Invitas como ${ROLE_LABELS[me.role] ?? me.role}. ` : ''}
          Cada quien invita su nivel o más abajo, nunca hacia arriba.
        </p>
      </div>

      {needsInit && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-300">La tabla de invitaciones aún no está inicializada.</p>
          <button onClick={initDb} disabled={initing}
            className="mt-3 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50">
            {initing ? 'Inicializando…' : 'Inicializar invitaciones'}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-primary/30 bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">Generar invitación</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Rol a invitar *</label>
            <select className={`${inputCls} w-full`} value={role} onChange={(e) => setRole(e.target.value)}>
              {allowed.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              {!allowed.length && <option value="">Sin roles disponibles</option>}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Email (opcional, envía invitación)</label>
            <input className={`${inputCls} w-full`} type="email" placeholder="persona@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Nombre / nota (opcional)</label>
            <input className={`${inputCls} w-full`} placeholder="Ej. Juan — chofer zona norte" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button onClick={create} disabled={creating || !role}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50">
              {creating ? 'Generando…' : 'Generar invitación'}
            </button>
          </div>
        </div>
        {msg && <p className="mt-3 text-sm text-emerald-400">{msg}</p>}
        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Activas ({active.length})</h2>
        <TableShell>
          <thead><tr><Th>Rol</Th><Th>Código</Th><Th>Para</Th><Th>Invitó</Th><Th>Creada</Th><Th>Enlace</Th><Th>Acciones</Th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {active.map((inv) => (
              <tr key={inv.id} className="hover:bg-surface-2/50">
                <Td><Badge value={inv.role} /></Td>
                <Td className="font-mono">{inv.code}</Td>
                <Td className="text-muted-foreground">{inv.email || inv.label || '—'}</Td>
                <Td className="text-muted-foreground">{inv.inviter_name ?? '—'}</Td>
                <Td className="text-muted-foreground">{new Date(inv.created_at).toLocaleDateString('es-MX')}</Td>
                <Td><button onClick={() => copy(inv.link, inv.id)} className={`${btnCls} bg-primary/15 text-primary hover:bg-primary/25`}>{copied === inv.id ? '¡Copiado!' : 'Copiar enlace'}</button></Td>
                <Td><button onClick={() => revoke(inv.id)} className={`${btnCls} bg-rose-500/15 text-rose-400 hover:bg-rose-500/25`}>Revocar</button></Td>
              </tr>
            ))}
            {!active.length && <tr><Td className="text-muted-foreground">Sin invitaciones activas</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td></tr>}
          </tbody>
        </TableShell>
      </div>

      {!!used.length && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Usadas / revocadas ({used.length})</h2>
          <TableShell>
            <thead><tr><Th>Rol</Th><Th>Código</Th><Th>Usada por</Th><Th>Estado</Th><Th>Fecha</Th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {used.map((inv) => (
                <tr key={inv.id} className="opacity-70">
                  <Td><Badge value={inv.role} /></Td>
                  <Td className="font-mono">{inv.code}</Td>
                  <Td className="text-muted-foreground">{inv.used_by_name ?? '—'}</Td>
                  <Td>{inv.used_by ? <Badge value="completed" /> : <Badge value="rejected" />}</Td>
                  <Td className="text-muted-foreground">{new Date(inv.used_at ?? inv.created_at).toLocaleDateString('es-MX')}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </div>
      )}
    </div>
  );
}
