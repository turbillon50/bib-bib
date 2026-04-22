'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, X, Loader2 } from 'lucide-react';
import { OfferCard } from '@/components/ride/OfferCard';
import { useSocket } from '@/hooks/useSocket';
import { useTripStore } from '@/store/tripStore';
import { api } from '@/lib/api';

export default function OffersPage() {
  const router = useRouter();
  const { activeRide, offers, addOffer, setActiveRide } = useTripStore();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);

  // Countdown
  useEffect(() => {
    if (!activeRide?.offer_expiry_at) return;
    const expiry = new Date(activeRide.offer_expiry_at).getTime();
    const interval = setInterval(() => {
      const remaining = Math.ceil((expiry - Date.now()) / 1000);
      setTimeLeft(Math.max(0, remaining));
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeRide?.offer_expiry_at]);

  // Socket events
  useEffect(() => {
    if (!socket || !activeRide?.id) return;

    socket.emit('ride:join', { rideId: activeRide.id });

    socket.on('trip:offer_received', ({ offer }) => addOffer(offer));
    socket.on('trip:accepted', (data) => {
      setActiveRide({ ...activeRide, ...data, status: 'accepted' });
      router.push('/app/trip');
    });
    socket.on('trip:expired', () => {
      setActiveRide({ ...activeRide, status: 'expired' });
      router.push('/app');
    });

    return () => {
      socket.off('trip:offer_received');
      socket.off('trip:accepted');
      socket.off('trip:expired');
    };
  }, [socket, activeRide?.id]);

  const handleAccept = async (offerId: string) => {
    setLoading(true);
    try {
      await api.put(`/offers/${offerId}/accept`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (offerId: string) => {
    try {
      await api.put(`/offers/${offerId}/reject`);
      useTripStore.getState().removeOffer(offerId);
    } catch {}
  };

  const handleCancel = async () => {
    if (!activeRide?.id) return;
    await api.post(`/rides/${activeRide.id}/cancel`, { reason: 'Cancelado por pasajero' }).catch(() => {});
    setActiveRide(null);
    router.push('/app');
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col">
      {/* Header */}
      <div className="safe-top px-4 pt-4 pb-3 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-black text-xl">Ofertas de choferes</h1>
          <button onClick={handleCancel} className="text-[#8B8B9E] hover:text-[#FF4757] transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Route summary */}
        {activeRide && (
          <div className="bg-[#111118] border border-[rgba(255,255,255,0.06)] rounded-2xl px-4 py-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-[#6C63FF]" />
              <span className="text-[#8B8B9E] truncate">{activeRide.origin_address ?? 'Origen'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={10} className="text-[#00D4AA]" />
              <span className="text-[#8B8B9E] truncate">{activeRide.destination_address ?? 'Destino'}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-[#8B8B9E]">Tu precio</span>
              <span className="font-mono font-bold text-[#6C63FF]">${activeRide.proposed_price}</span>
            </div>
          </div>
        )}
      </div>

      {/* Timer */}
      <div className="flex items-center justify-center gap-2 py-3 bg-[rgba(108,99,255,0.06)] border-b border-[rgba(255,255,255,0.04)]">
        <Clock size={14} className={timeLeft < 60 ? 'text-[#FF4757]' : 'text-[#8B8B9E]'} />
        <span className={`text-sm font-mono font-bold ${timeLeft < 60 ? 'text-[#FF4757]' : 'text-[#8B8B9E]'}`}>
          Busqueda expira en {mins}:{secs.toString().padStart(2, '0')}
        </span>
      </div>

      {/* Offers list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        <AnimatePresence>
          {offers.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-48 text-center">
              <Loader2 size={40} className="text-[#6C63FF] animate-spin mb-4" />
              <p className="text-[#8B8B9E]">Buscando choferes cerca de ti...</p>
              <p className="text-xs text-[#4A4A5A] mt-1">Las ofertas aparecerán aquí</p>
            </motion.div>
          ) : (
            offers.map((offer, i) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                index={i}
                onAccept={handleAccept}
                onReject={handleReject}
                loading={loading}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
