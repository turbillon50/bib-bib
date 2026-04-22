'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowLeft } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Earnings {
  today_gross: number; today_trips: number;
  week_gross: number; week_trips: number;
  month_gross: number; month_trips: number;
  total_trips: number;
}

function CountUp({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const steps = 60;
    const stepDuration = (duration * 1000) / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setDisplay(Math.min(value * (step / steps), value));
      if (step >= steps) clearInterval(timer);
    }, stepDuration);
    return () => clearInterval(timer);
  }, [value]);
  return <span>${display.toFixed(2)}</span>;
}

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/drivers/me/earnings').then(res => {
      setEarnings(res.data?.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-24">
      {/* Header */}
      <div className="safe-top px-4 pt-4 pb-4 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-3">
          <Link href="/driver" className="text-[#8B8B9E] hover:text-white transition-colors">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="font-black text-xl">Mis Ganancias</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Big number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-[rgba(108,99,255,0.15)] to-[rgba(0,212,170,0.08)] border border-[rgba(108,99,255,0.2)] rounded-3xl p-6 text-center"
        >
          <p className="text-sm text-[#8B8B9E] mb-2">Este mes</p>
          <div className="text-5xl font-black font-mono bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] bg-clip-text text-transparent">
            {earnings ? <CountUp value={earnings.month_gross} /> : '...'}
          </div>
          <div className="flex items-center justify-center gap-1 mt-2 text-[#2ED573] text-sm">
            <TrendingUp size={14} />
            <span>{earnings?.month_trips ?? 0} viajes completados</span>
          </div>
        </motion.div>

        {/* Periods */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Hoy', gross: earnings?.today_gross, trips: earnings?.today_trips },
            { label: 'Esta semana', gross: earnings?.week_gross, trips: earnings?.week_trips },
          ].map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#111118] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4"
            >
              <div className="text-xs text-[#8B8B9E] mb-1">{p.label}</div>
              <div className="text-2xl font-black font-mono text-white">
                ${(p.gross ?? 0).toFixed(2)}
              </div>
              <div className="text-xs text-[#4A4A5A] mt-1">{p.trips ?? 0} viajes</div>
            </motion.div>
          ))}
        </div>

        {/* Total */}
        <div className="bg-[#111118] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Total de viajes</div>
            <div className="text-xs text-[#8B8B9E] mt-0.5">Desde que te uniste</div>
          </div>
          <div className="text-2xl font-black font-mono text-[#00D4AA]">
            {earnings?.total_trips ?? 0}
          </div>
        </div>
      </div>

      <BottomNav role="driver" />
    </div>
  );
}
