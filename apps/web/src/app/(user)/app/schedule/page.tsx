'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Clock, DollarSign, Banknote, CreditCard } from '@/components/icons';
import { BottomNav } from '@/components/layout/BottomNav';
import { useTripStore } from '@/store/tripStore';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function SchedulePage() {
  const router = useRouter();
  const { setActiveRide } = useTripStore();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [price, setPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const minDate = new Date();
  minDate.setMinutes(minDate.getMinutes() + 30);
  const minDateStr = minDate.toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 7);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!origin || !destination || !date || !time || !price) {
      setError('Completa todos los campos');
      return;
    }
    const scheduledAt = new Date(`${date}T${time}`);
    if (scheduledAt <= new Date()) {
      setError('La fecha debe ser al menos 30 minutos en el futuro');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/rides', {
        originAddress: origin,
        destinationAddress: destination,
        proposedPrice: parseFloat(price),
        paymentMethod,
        scheduledAt: scheduledAt.toISOString(),
      });
      setActiveRide(res.data?.data);
      router.push('/app');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al programar el viaje';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pl-20">
      <div className="safe-top px-4 pt-4 pb-4 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-3">
          <Link href="/app" className="text-[#8B8B9E] hover:text-white transition-colors">
            <ArrowLeft size={22} />
          </Link>
          <div>
            <h1 className="font-black text-xl">Programar Viaje</h1>
            <p className="text-xs text-[#8B8B9E]">Hasta 7 días de anticipación</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Route */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111118] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[rgba(255,255,255,0.04)]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#e85d04] flex-shrink-0" />
              <input
                type="text"
                placeholder="¿Desde dónde sales?"
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder-[#4A4A5A]"
              />
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <MapPin size={11} className="text-[#f4a100] flex-shrink-0" />
              <input
                type="text"
                placeholder="¿A dónde vas?"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder-[#4A4A5A]"
              />
            </div>
          </motion.div>

          {/* Date & Time */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="grid grid-cols-2 gap-3"
          >
            <div className="bg-[#111118] border border-[rgba(255,255,255,0.06)] rounded-2xl px-4 py-3.5">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={13} className="text-[#e85d04]" />
                <span className="text-xs text-[#8B8B9E]">Fecha</span>
              </div>
              <input
                type="date"
                value={date}
                min={minDateStr}
                max={maxDateStr}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-transparent text-sm outline-none text-white [color-scheme:dark]"
              />
            </div>
            <div className="bg-[#111118] border border-[rgba(255,255,255,0.06)] rounded-2xl px-4 py-3.5">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={13} className="text-[#e85d04]" />
                <span className="text-xs text-[#8B8B9E]">Hora</span>
              </div>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full bg-transparent text-sm outline-none text-white [color-scheme:dark]"
              />
            </div>
          </motion.div>

          {/* Price */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="bg-[#111118] border border-[rgba(255,255,255,0.06)] rounded-2xl px-4 py-3.5"
          >
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={13} className="text-[#f4a100]" />
              <span className="text-xs text-[#8B8B9E]">Tu precio propuesto</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#8B8B9E] font-mono">$</span>
              <input
                type="number"
                placeholder="0.00"
                value={price}
                min="1"
                step="0.50"
                onChange={e => setPrice(e.target.value)}
                className="flex-1 bg-transparent text-2xl font-black font-mono outline-none placeholder-[#2A2A3A] text-[#e85d04]"
              />
            </div>
            <p className="text-xs text-[#4A4A5A] mt-1">Los choferes podrán aceptar o hacer contra-oferta</p>
          </motion.div>

          {/* Payment method */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-3"
          >
            {(['cash', 'card'] as const).map(method => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl border transition-all ${
                  paymentMethod === method
                    ? 'border-[#e85d04] bg-[rgba(232,93,4,0.1)] text-white'
                    : 'border-[rgba(255,255,255,0.06)] bg-[#111118] text-[#8B8B9E]'
                }`}
              >
                {method === 'cash' ? <Banknote size={16} /> : <CreditCard size={16} />}
                <span className="text-sm font-medium">{method === 'cash' ? 'Efectivo' : 'Tarjeta'}</span>
              </button>
            ))}
          </motion.div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-[#FF4757] text-center"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#e85d04] to-[#f4a100] font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Calendar size={18} />
                Programar viaje
              </>
            )}
          </motion.button>
        </form>

        {/* Info card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-4 bg-[rgba(232,93,4,0.06)] border border-[rgba(232,93,4,0.15)] rounded-2xl p-4 space-y-2"
        >
          <p className="text-xs font-semibold text-[#e85d04]">¿Cómo funciona?</p>
          {[
            'Programa tu viaje con hasta 7 días de anticipación',
            'Recibirás ofertas de choferes 15 minutos antes de tu viaje',
            'Elige al chofer con el mejor precio y calificación',
            'Recibe notificación cuando tu chofer esté en camino',
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-[#8B8B9E]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#e85d04] mt-1 flex-shrink-0" />
              {tip}
            </div>
          ))}
        </motion.div>
      </div>

      <BottomNav role="passenger" />
    </div>
  );
}
