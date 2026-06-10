'use client';

import { FormEvent, useEffect, useState } from 'react';
import { applyBranding, applyTheme, type BrandingConfig } from '@/components/BrandingProvider';
import { inputCls } from '@/components/admin/ui';

const DEFAULT_BRANDING: BrandingConfig = {
  app_name: 'RideMe',
  primary_color: '#6C63FF',
  accent_color: '#00D4AA',
  logo_url: '/brand/hero.jpg',
  icon_url: '/brand/icon-192.png',
  theme: 'dark',
};

export default function AdminBrandingPage() {
  const [form, setForm] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/branding', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setForm({ ...DEFAULT_BRANDING, ...(data.branding ?? {}) }))
      .catch(() => setError('No se pudo cargar la personalizacion.'))
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof BrandingConfig>(key: K, value: BrandingConfig[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch('/api/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      const branding = { ...DEFAULT_BRANDING, ...data.branding } as BrandingConfig;
      setForm(branding);
      applyBranding(branding);
      applyTheme(branding.theme);
      setMessage('Personalizacion guardada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground animate-pulse">Cargando personalizacion...</p>;

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Personalizacion</h1>
        <p className="text-sm text-muted-foreground">White-label de RideMe para nombre, colores e iconos.</p>
      </div>

      <form onSubmit={submit} className="rounded-xl border border-white/5 bg-surface p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nombre app</span>
            <input className={`${inputCls} w-full`} value={form.app_name} onChange={(event) => update('app_name', event.target.value)} />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modo default</span>
            <select className={`${inputCls} w-full`} value={form.theme} onChange={(event) => update('theme', event.target.value as BrandingConfig['theme'])}>
              <option value="dark">Noche</option>
              <option value="light">Dia</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Color primario</span>
            <div className="flex gap-2">
              <input type="color" value={form.primary_color} onChange={(event) => update('primary_color', event.target.value)} className="h-10 w-12 rounded-lg border border-white/10 bg-surface-2 p-1" />
              <input className={`${inputCls} min-w-0 flex-1 font-mono`} value={form.primary_color} onChange={(event) => update('primary_color', event.target.value)} />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Color acento</span>
            <div className="flex gap-2">
              <input type="color" value={form.accent_color} onChange={(event) => update('accent_color', event.target.value)} className="h-10 w-12 rounded-lg border border-white/10 bg-surface-2 p-1" />
              <input className={`${inputCls} min-w-0 flex-1 font-mono`} value={form.accent_color} onChange={(event) => update('accent_color', event.target.value)} />
            </div>
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Logo URL</span>
            <input className={`${inputCls} w-full`} value={form.logo_url} onChange={(event) => update('logo_url', event.target.value)} placeholder="/brand/hero.jpg" />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Icono URL</span>
            <input className={`${inputCls} w-full`} value={form.icon_url} onChange={(event) => update('icon_url', event.target.value)} placeholder="/brand/icon-192.png" />
          </label>
        </div>

        <div className="mt-5 rounded-xl border border-white/5 bg-surface-2 p-4">
          <div className="flex items-center gap-3">
            <img src={form.icon_url || '/brand/icon-192.png'} alt="" className="h-12 w-12 rounded-xl object-cover" />
            <div>
              <div className="font-bold" style={{ color: form.primary_color }}>{form.app_name || 'RideMe'}</div>
              <div className="text-sm text-muted-foreground">Vista previa de marca</div>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full" style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.accent_color})` }} />
        </div>

        {message && <p className="mt-4 text-sm text-emerald-400">{message}</p>}
        {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}

        <button type="submit" disabled={saving} className="btn-gradient mt-5 rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-50">
          {saving ? 'Guardando...' : 'Guardar personalizacion'}
        </button>
      </form>
    </div>
  );
}
