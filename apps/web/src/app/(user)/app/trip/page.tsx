'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, MessageCircle, MapPin, Star, ChevronDown, Navigation } from '@/components/icons';
import { MapView } from '@/components/maps/MapView';
import { useSocket } from '@/hooks/useSocket';
import { useTripStore } from '@/store/tripStore';
import { useGeolocation } from '@/hooks/useGeolocation';
import { api } from '@/lib/api';

type TripStatus = 'accepted' | 'driver_en_route' | 'arrived' | 'in_progress' | 'completed';

const statusMessages: Record<TripStatus, string> = {
  accepted: 'Chofer confirmado – en camino a ti',
  driver_en_route: 'Tu chofer está en camino',
  arrived: 'El chofer llegó a tu ubicación',
  in_progress: 'Estás en camino a tu destino',
  completed: '¡Llegaste! Que tengas un buen viaje',
};

const statusColors: Record<TripStatus, string> = {
  accepted: '#6C63FF',
  driver_en_route: '#6C63FF',
  arrived: '#FFA502',
  in_progress: '#00D4AA',
  completed: '#2ED573',
};

export default function TripTrackingPage() {
  const router = useRouter();
  const { activeRide, setActiveRide } = useTripStore();
  const { socket } = useSocket();
  const { location } = useGeolocation();
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | undefined>();
  const [status, setStatus] = useState<TripStatus>('accepted');
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(5);

  const center = location ? { lat: location.latitude, lng: location.longitude } : { lat: 19.4326, lng: -99.1332 };

  useEffect(() => {
    if (!activeRide) { router.push('/app'); return; }
    setStatus(activeRide.status as TripStatus);
  }, [activeRide?.status]);

  // Socket events
  useEffect(() => {
    if (!socket || !activeRide?.id) return;

    socket.emit('ride:join', { rideId: activeRide.id });

    socket.on('driver:location_updated', ({ latitude, longitude }) => {
      setDriverLocation({ lat: latitude, lng: longitude });
    });

    socket.on('trip:driver_arrived', () => setStatus('arrived'));
    socket.on('trip:started', () => setStatus('in_progress'));
    socket.on('trip:completed', () => {
      setStatus('completed');
      setTimeout(() => setShowRating(true), 1500);
    });

    return () => {
      socket.off('driver:location_updated');
      socket.off('trip:driver_arrived');
      socket.off('trip:started');
      socket.off('trip:completed');
    };
  }, [socket, activeRide?.id]);

  const handleRate = async () => {
    if (!activeRide?.id) return;
    await api.post(`/rides/${activeRide.id}/rate`, { stars: rating }).catch(() => {});
    setActiveRide(null);
    router.push('/app');
  };

  if (!activeRide) return null;

  const color = statusColors[status] ?? '#6C63FF';

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background md:pl-20">
      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          center={driverLocation ?? center}
          userLocation={center}
          driverLocation={driverLocation}
          className="w-full h-full"
        />

        {/* Status overlay */}
        <div className="absolute top-4 left-4 right-4 safe-top">
          <motion.div
            key={status}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-[rgba(17,17,24,0.95)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-2xl px-4 py-3"
          >
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
            <span className="text-sm font-semibold">{statusMessages[status]}</span>
          </motion.div>
        </div>
      </div>

      {/* Bottom panel */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="bg-[#111118] border-t border-[rgba(255,255,255,0.08)] rounded-t-3xl px-5 pt-4 pb-8"
      >
        <div className="sheet-handle mb-4" />

        {/* Driver info */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
            {activeRide.driver_name?.[0] ?? 'C'}
          </div>
          <div className="flex-1">
            <div className="font-bold">{activeRide.driver_name ?? 'Tu chofer'}</div>
            <div className="flex items-center gap-2 text-sm text-[#8B8B9E] mt-0.5">
              <Star size={13} className="text-[#FFD700] fill-[#FFD700]" />
              <span>{activeRide.driver_rating ?? '5.0'}</span>
              <span>·</span>
              <span>{activeRide.vehicle_make} {activeRide.vehicle_model}</span>
            </div>
            <div className="text-xs text-[#4A4A5A] mt-0.5">{activeRide.plate_number}</div>
          </div>
          <div className="flex gap-2">
            <button className="w-11 h-11 rounded-xl bg-[#1A1A24] flex items-center justify-center border border-[rgba(255,255,255,0.08)] hover:border-[rgba(108,99,255,0.3)] transition-colors">
              <Phone size={18} className="text-[#6C63FF]" />
            </button>
            <button className="w-11 h-11 rounded-xl bg-[#1A1A24] flex items-center justify-center border border-[rgba(255,255,255,0.08)] hover:border-[rgba(108,99,255,0.3)] transition-colors">
              <MessageCircle size={18} className="text-[#6C63FF]" />
            </button>
          </div>
        </div>

        {/* Destination */}
        <div className="flex items-center gap-3 bg-[#1A1A24] rounded-xl px-4 py-3">
          <MapPin size={15} className="text-[#00D4AA]" />
          <span className="text-sm text-[#8B8B9E] truncate">{activeRide.destination_address}</span>
          <div className="ml-auto font-mono font-bold text-[#6C63FF]">${activeRide.final_price}</div>
        </div>
      </motion.div>

      {/* Rating modal */}
      <AnimatePresence>
        {showRating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[rgba(0,0,0,0.8)]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-3xl p-6 text-center"
            >
              <div className="text-5xl mb-3">🎉</div>
              <h3 className="text-xl font-black mb-1">¡Llegaste!</h3>
              <p className="text-[#8B8B9E] text-sm mb-6">¿Cómo fue tu viaje con {activeRide.driver_name}?</p>

              <div className="flex justify-center gap-3 mb-6">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setRating(s)}>
                    <Star size={36} className={s <= rating ? 'text-[#FFD700] fill-[#FFD700]' : 'text-[#4A4A5A]'} />
                  </button>
                ))}
              </div>

              <button onClick={handleRate} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] font-bold">
                Enviar calificación
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
