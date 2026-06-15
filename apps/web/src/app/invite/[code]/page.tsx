'use client';

import { useEffect, useState } from 'react';
import { useUser, SignInButton, SignUpButton } from '@clerk/nextjs';

export default function InvitePage({ params }: { params: { code: string } }) {
  const code = (params.code || '').toUpperCase();
  const { isLoaded, isSignedIn } = useUser();
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invitations/validate?code=${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((j) => setInfo(j))
      .catch(() => setInfo({ valid: false, reason: 'Error de red' }))
      .finally(() => setLoading(false));
  }, [code]);

  const accept = async () => {
    setAccepting(true); setErr(null);
    try {
      const r = await fetch('/api/invitations/accept', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      window.location.href = j.redirect || '/app';
    } catch (e: any) { setErr(e.message); setAccepting(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/5 bg-surface p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-black text-white">R</div>
          <span className="text-xl font-bold text-primary">Bib-Bib</span>
        </div>

        {loading && <p className="text-muted-foreground animate-pulse">Validando invitación…</p>}

        {!loading && info && !info.valid && (
          <div>
            <h1 className="mb-2 text-xl font-bold">Invitación no válida</h1>
            <p className="text-sm text-muted-foreground">{info.reason ?? 'Este código no es válido.'}</p>
            <a href="/" className="mt-6 inline-block text-sm text-primary">← Ir al inicio</a>
          </div>
        )}

        {!loading && info && info.valid && (
          <div>
            <h1 className="mb-2 text-xl font-bold">Tienes una invitación</h1>
            <p className="text-sm text-muted-foreground">
              {info.invitedBy ? <><strong className="text-foreground">{info.invitedBy}</strong> te invitó </> : 'Te invitaron '}
              a unirte a Bib-Bib como <strong className="text-primary">{info.roleLabel}</strong>
              {info.label ? <> — {info.label}</> : null}.
            </p>

            <div className="mt-6">
              {!isLoaded && <p className="text-muted-foreground animate-pulse">Cargando…</p>}

              {isLoaded && isSignedIn && (
                <button onClick={accept} disabled={accepting}
                  className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:bg-accent-hover disabled:opacity-50">
                  {accepting ? 'Aceptando…' : 'Aceptar invitación'}
                </button>
              )}

              {isLoaded && !isSignedIn && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Crea tu cuenta o inicia sesión para aceptar:</p>
                  <SignUpButton mode="modal" forceRedirectUrl={`/invite/${code}`}>
                    <button className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:bg-accent-hover">Crear cuenta</button>
                  </SignUpButton>
                  <SignInButton mode="modal" forceRedirectUrl={`/invite/${code}`}>
                    <button className="w-full rounded-xl border border-white/10 px-4 py-3 font-semibold text-foreground hover:bg-surface-2">Ya tengo cuenta</button>
                  </SignInButton>
                </div>
              )}
              {err && <p className="mt-3 text-sm text-rose-400">{err}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
