'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Lock, Zap, Check } from 'lucide-react';
import { useDriverStore } from '@/store/driverStore';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function SubscriptionCheckoutPage() {
  const router = useRouter();
  const { setSubscriptionStatus } = useDriverStore();
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatCard = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/subscriptions', {
        paymentMethodId: 'pm_card_visa',
      });
      setSubscriptionStatus('active');
      router.push('/driver/subscription');
    } catch (err: unknown) {
      setError('No se pudo procesar el pago. Verifica tus datos.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'Recibe viajes ilimitados',
    'Acceso a toda la red de pasajeros',
    'Soporte prioritario',
    'Estadísticas de ganancias',
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <div className="safe-top px-4 pt-4 pb-4 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-3">
          <Link href="/driver/subscription" className="text-[#8B8B9E] hover:text-white transition-colors">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="font-black text-xl">Activar Plan</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-5 max-w-md mx-auto">
        {/* Plan summary */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[rgba(108,99,255,0.2)] to-[rgba(0,212,170,0.1)] border border-[rgba(108,99,255,0.25)] rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-black text-lg">Plan Mensual</div>
              <div className="text-xs text-[#8B8B9E]">Facturado mensualmente</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black font-mono bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] bg-clip-text text-transparent">
                $299
              </div>
              <div className="text-xs text-[#8B8B9E]">MXN/mes</div>
            </div>
          </div>
          <div className="space-y-1.5">
            {features.map(f => (
              <div key={f} className="flex items-center gap-2 text-xs">
                <Check size={12} className="text-[#2ED573]" />
                <span className="text-[#8B8B9E]">{f}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Card form */}
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="bg-[#111118] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.04)]">
              <p className="text-xs font-semibold text-[#8B8B9E] uppercase tracking-wider flex items-center gap-2">
                <CreditCard size={12} /> Datos de la tarjeta
              </p>
            </div>

            {/* Card number */}
            <div className="px-4 py-3.5 border-b border-[rgba(255,255,255,0.04)]">
              <label className="text-xs text-[#4A4A5A] block mb-1.5">Número de tarjeta</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={e => setCardNumber(formatCard(e.target.value))}
                className="w-full bg-transparent text-sm font-mono outline-none placeholder-[#2A2A3A] tracking-wider"
              />
            </div>

            {/* Expiry + CVC */}
            <div className="grid grid-cols-2 divide-x divide-[rgba(255,255,255,0.04)]">
              <div className="px-4 py-3.5">
                <label className="text-xs text-[#4A4A5A] block mb-1.5">Vencimiento</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={e => setExpiry(formatExpiry(e.target.value))}
                  className="w-full bg-transparent text-sm font-mono outline-none placeholder-[#2A2A3A]"
                />
              </div>
              <div className="px-4 py-3.5">
                <label className="text-xs text-[#4A4A5A] block mb-1.5">CVC</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="123"
                  maxLength={4}
                  value={cvc}
                  onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full bg-transparent text-sm font-mono outline-none placeholder-[#2A2A3A]"
                />
              </div>
            </div>

            {/* Name */}
            <div className="px-4 py-3.5 border-t border-[rgba(255,255,255,0.04)]">
              <label className="text-xs text-[#4A4A5A] block mb-1.5">Nombre en la tarjeta</label>
              <input
                type="text"
                placeholder="Como aparece en la tarjeta"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder-[#2A2A3A]"
              />
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-[#FF4757] text-center"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Zap size={18} /> Activar suscripción – $299/mes</>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-[#4A4A5A]">
            <Lock size={11} />
            <span>Pago seguro procesado por Stripe</span>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
