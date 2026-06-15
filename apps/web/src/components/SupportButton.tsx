'use client';

import { FormEvent, useMemo, useState } from 'react';
import { AlertCircle, Send, X } from '@/components/icons';
import { useAuthStore } from '@/store/authStore';

export function SupportButton() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const userRef = useMemo(() => {
    return user?.email || user?.phone || user?.id || 'anonymous';
  }, [user?.email, user?.phone, user?.id]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('sending');
    setError('');

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, screenshot: screenshot || undefined, userRef }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el reporte');
      setStatus('sent');
      setMessage('');
      setScreenshot('');
      setTimeout(() => {
        setOpen(false);
        setStatus('idle');
      }, 1200);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'No se pudo enviar el reporte');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-[70] inline-flex items-center gap-2 rounded-2xl border border-primary/30 bg-surface/95 px-4 py-3 text-sm font-semibold text-foreground shadow-modal backdrop-blur transition hover:border-primary md:bottom-6"
      >
        <AlertCircle size={17} className="text-primary" />
        Reportar
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 px-4 pb-4 pt-20 backdrop-blur-sm md:items-center md:pb-0">
          <form
            onSubmit={submit}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-surface p-5 shadow-modal"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Reportar un problema</h2>
                <p className="text-sm text-muted-foreground">El equipo de Bib-Bib revisara tu reporte.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
                aria-label="Cerrar soporte"
              >
                <X size={18} />
              </button>
            </div>

            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mensaje
            </label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              minLength={4}
              rows={5}
              className="mb-4 w-full resize-none rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              placeholder="Describe que paso..."
            />

            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Screenshot URL opcional
            </label>
            <input
              value={screenshot}
              onChange={(event) => setScreenshot(event.target.value)}
              type="url"
              className="mb-4 w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              placeholder="https://..."
            />

            {error && <p className="mb-3 text-sm text-rose-400">{error}</p>}
            {status === 'sent' && <p className="mb-3 text-sm text-emerald-400">Reporte enviado.</p>}

            <button
              type="submit"
              disabled={status === 'sending' || !message.trim()}
              className="btn-gradient flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
            >
              <Send size={16} />
              {status === 'sending' ? 'Enviando...' : 'Enviar reporte'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
