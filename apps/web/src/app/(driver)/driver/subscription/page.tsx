'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle, AlertCircle, ArrowLeft, ExternalLink, Zap } from '@/components/icons';
import { BottomNav } from '@/components/layout/BottomNav';
import { useDriverStore } from '@/store/driverStore';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Plan {
  id: string; name: string; amount: number; currency: string;
  interval: string; tripFeeAmount: number; features: string[];
}

interface SubStatus {
  stripe_subscription_id: string | null;
  subscription_status: string;
  subscription_period_end: string | null;
}

export default function SubscriptionPage() {
  const { subscriptionStatus, setSubscriptionStatus } = useDriverStore();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [sub, setSub] = useState<SubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/subscriptions/plans'),
      api.get('/subscriptions/me'),
    ]).then(([plansRes, subRes]) => {
      setPlan(plansRes.data?.data?.[0] ?? null);
      setSub(subRes.data?.data ?? null);
      if (subRes.data?.data?.subscription_status) {
        setSubscriptionStatus(subRes.data.data.subscription_status);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await api.post('/subscriptions/portal');
      window.location.href = res.data?.data?.url;
    } catch {
      alert('No se pudo abrir el portal de pagos');
    } finally {
      setPortalLoading(false);
    }
  };

  const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  const isPastDue = subscriptionStatus === 'past_due';

  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-24">
      <div className="safe-top px-4 pt-4 pb-4 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-3">
          <Link href="/driver" className="text-[#8B8B9E] hover:text-white transition-colors">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="font-black text-xl">Mi Suscripción</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Status banner */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-3 p-4 rounded-2xl border ${
              isActive
                ? 'bg-[rgba(46,213,115,0.08)] border-[rgba(46,213,115,0.25)]'
                : isPastDue
                ? 'bg-[rgba(255,71,87,0.08)] border-[rgba(255,71,87,0.25)]'
                : 'bg-[rgba(255,165,2,0.08)] border-[rgba(255,165,2,0.25)]'
            }`}
          >
            {isActive ? (
              <CheckCircle size={20} className="text-[#2ED573]" />
            ) : (
              <AlertCircle size={20} className={isPastDue ? 'text-[#FF4757]' : 'text-[#FFA502]'} />
            )}
            <div>
              <div className={`font-semibold text-sm ${isActive ? 'text-[#2ED573]' : isPastDue ? 'text-[#FF4757]' : 'text-[#FFA502]'}`}>
                {isActive ? 'Suscripción activa' : isPastDue ? 'Pago fallido' : 'Sin suscripción activa'}
              </div>
              {sub?.subscription_period_end && isActive && (
                <div className="text-xs text-[#8B8B9E] mt-0.5">
                  Renueva: {new Date(sub.subscription_period_end).toLocaleDateString('es')}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Plan card */}
        {plan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111118] border border-[rgba(108,99,255,0.2)] rounded-3xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[rgba(108,99,255,0.15)] to-[rgba(0,212,170,0.08)] px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-lg">{plan.name}</div>
                  <div className="text-xs text-[#8B8B9E]">por {plan.interval}</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black font-mono bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] bg-clip-text text-transparent">
                    ${plan.amount}
                  </div>
                  <div className="text-xs text-[#8B8B9E]">{plan.currency}</div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              {plan.features.map((f) => (
                <div key={f} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[rgba(0,212,170,0.15)] flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#00D4AA]" />
                  </div>
                  <span className="text-sm">{f}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        {isActive ? (
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="w-full py-4 rounded-2xl border border-[rgba(255,255,255,0.1)] font-semibold flex items-center justify-center gap-2 hover:border-[rgba(108,99,255,0.3)] transition-colors disabled:opacity-50"
          >
            {portalLoading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <><CreditCard size={18} /> Gestionar suscripción <ExternalLink size={14} className="text-[#8B8B9E]" /></>
            )}
          </button>
        ) : (
          <Link
            href="/driver/subscription/checkout"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Zap size={18} /> Activar suscripción
          </Link>
        )}
      </div>

      <BottomNav role="driver" />
    </div>
  );
}
