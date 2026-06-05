'use client';

import { useEffect, useState } from 'react';
import { KpiCard, Badge, TableShell, Th, Td } from '@/components/admin/ui';

const mxn = (v: any) => `$${Number(v ?? 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? 'Error');
        setData(j);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-rose-400">Error: {error}</p>;
  if (!data) return <p className="text-muted-foreground animate-pulse">Cargando dashboard…</p>;

  const k = data.kpis ?? {};
  const maxRides = Math.max(1, ...(data.ridesByDay ?? []).map((d: any) => Number(d.rides)));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen operativo de RideMe</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Viajes hoy" value={String(k.rides_today ?? 0)} accent />
        <KpiCard label="Viajes activos" value={String(k.rides_active ?? 0)} />
        <KpiCard label="Choferes en línea" value={String(k.drivers_online ?? 0)} sub={`${k.total_drivers ?? 0} registrados`} />
        <KpiCard label="Choferes por aprobar" value={String(k.drivers_pending ?? 0)} />
        <KpiCard label="Usuarios" value={String(k.total_users ?? 0)} sub={`+${k.new_users_30d ?? 0} en 30 días`} />
        <KpiCard label="Viajes totales" value={String(k.total_rides ?? 0)} sub={`${k.rides_completed ?? 0} completados · ${k.rides_canceled ?? 0} cancelados`} />
        <KpiCard label="Ingresos 30 días" value={mxn(k.revenue_30d)} accent />
        <KpiCard label="Ticket promedio" value={mxn(k.avg_ticket)} sub={`Total histórico ${mxn(k.revenue_total)}`} />
      </div>

      <div className="rounded-xl border border-white/5 bg-surface p-4">
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Viajes — últimos 14 días</h2>
        <div className="flex h-32 items-end gap-1.5">
          {(data.ridesByDay ?? []).map((d: any) => (
            <div key={d.day} className="group relative flex-1">
              <div
                className="rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                style={{ height: `${(Number(d.rides) / maxRides) * 112 + 4}px` }}
              />
              <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-surface-3 px-1.5 py-0.5 text-[10px] opacity-0 group-hover:opacity-100">
                {new Date(d.day).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}: {d.rides}
              </span>
            </div>
          ))}
          {!(data.ridesByDay ?? []).length && <p className="text-sm text-muted-foreground">Sin datos aún</p>}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Viajes recientes</h2>
        <TableShell>
          <thead><tr><Th>Pasajero</Th><Th>Origen → Destino</Th><Th>Precio</Th><Th>Estado</Th><Th>Fecha</Th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {(data.recentRides ?? []).map((r: any) => (
              <tr key={r.id} className="hover:bg-surface-2/50">
                <Td>{r.passenger_name ?? '—'}</Td>
                <Td className="max-w-md truncate text-muted-foreground">{r.origin_address} → {r.destination_address}</Td>
                <Td>{mxn(r.final_price ?? r.proposed_price)}</Td>
                <Td><Badge value={r.status} /></Td>
                <Td className="text-muted-foreground">{new Date(r.created_at).toLocaleString('es-MX')}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </div>
    </div>
  );
}
