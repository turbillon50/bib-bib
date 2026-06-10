'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Phone, MessageCircle, CheckCircle, Flag } from '@/components/icons';
import { MapView } from '@/components/maps/MapView';
import { useSocket } from '@/hooks/useSocket';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useTripStore } from '@/store/tripStore';
import { api } from '@/lib/api';

type DriverTripStatus = 'accepted' | 'en_route' | 'arrived' | 'in_progress';

const statusConfig: Record<DriverTripStatus, { label: string; color: string; action: string }> = {
  accepted: { label: 'Ve a recoger al pasajero', color: '#6C63FF', action: 'Llegué al origen' },
  en_route: { label: 'En camino al pasajero', color: '#6C63FF', action: 'Llegué al origen' },
  arrived: { label: 'Esperando al pasajero', color: '#FFA502', action: 'Iniciar viaje' },
  in_progress: { label: 'Viaje en progreso', color: '#00D4AA', action: 'Completar viaje' },
};

export default function DriverTripPage() {
  const router = useRouter();
  const { activeRide, setActiveRide } = useTripStore();
  const { socket } = useSocket();
  const { location } = useGeolocation();
  const [status, setStatus] = useState<DriverTripStatus>('accepted');
  const [loading, setLoading] = useState(false);

  const center = location ? { lat: location.latitude, lng: location.longitude } : { lat: 19.4326, lng: -99.1332 };

  useEffect(() => {
    if (!activeRide) { router.push('/driver'); return; }
  }, [activeRide]);

  // Broadcast location while on trip
  useEffect(() => {
    if (!socket || !location || !activeRide?.id) return;
    const interval = setInterval(() => {
      socket.emit('driver:update_location', { latitude: location.latitude, longitude: location.longitude });
    }, 4000);
    return () => clearInterval(interval);
  }, [socket, location?.latitude, location?.longitude, activeRide?.id]);

  const handleAction = async () => {
    if (!activeRide?.id) return;
    setLoading(true);
    try {
      if (status === 'accepted' || status === 'en_route') {
        await api.post(`/rides/${activeRide.id}/arrived`);
        socket?.emit('trip:arrived_pickup', { tripId: activeRide.id });
        setStatus('arrived');
      } else if (status === 'arrived') {
        await api.post(`/rides/${activeRide.id}/start`);
        socket?.emit('trip:start', { tripId: activeRide.id });
        setStatus('in_progress');
      } else if (status === 'in_progress') {
        await api.post(`/rides/${activeRide.id}/complete`);
        socket?.emit('trip:complete', { tripId: activeRide.id });
        setActiveRide(null);
        router.push('/driver');
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  if (!activeRide) return null;

  const cfg = statusConfig[status];

  return (
    <div className="h-screen bg-[#0A0A0F] flex flex-col overflow-hidden">
      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          center={center}
          userLocation={center}
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
            <div
              className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse"
              style={{ backgroundColor: cfg.color, boxShadow: `0 0 10px ${cfg.color}` }}
            />
            <span className="text-sm font-semibold">{cfg.label}</span>
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

        {/* Passenger info */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00D4AA] to-[#6C63FF] flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
            {activeRide.passenger_name?.[0]?.toUpperCase() ?? 'P'}
          </div>
          <div className="flex-1">
            <div className="font-bold">{activeRide.passenger_name ?? 'Pasajero'}</div>
            <div className="text-xs text-[#8B8B9E] mt-0.5">
              {status === 'in_progress' ? 'En camino al destino' : 'Esperando en origen'}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="w-11 h-11 rounded-xl bg-[#1A1A24] flex items-center justify-center border border-[rgba(255,255,255,0.08)] hover:border-[rgba(0,212,170,0.3)] transition-colors">
              <Phone size={18} className="text-[#00D4AA]" />
            </button>
            <button className="w-11 h-11 rounded-xl bg-[#1A1A24] flex items-center justify-center border border-[rgba(255,255,255,0.08)] hover:border-[rgba(0,212,170,0.3)] transition-colors">
              <MessageCircle size={18} className="text-[#00D4AA]" />
            </button>
          </div>
        </div>

        {/* Route */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-3 bg-[#1A1A24] rounded-xl px-4 py-3">
            <MapPin size={14} className="text-[#6C63FF] flex-shrink-0" />
            <span className="text-sm text-[#8B8B9E] truncate flex-1">{activeRide.origin_address}</span>
          </div>
          <div className="flex items-center gap-3 bg-[#1A1A24] rounded-xl px-4 py-3">
            <Flag size={14} className="text-[#00D4AA] flex-shrink-0" />
            <span className="text-sm text-[#8B8B9E] truncate flex-1">{activeRide.destination_address}</span>
            <div className="ml-auto font-mono font-bold text-[#6C63FF]">${activeRide.final_price}</div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleAction}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          style={{
            background: status === 'in_progress'
              ? 'linear-gradient(135deg, #2ED573, #00D4AA)'
              : 'linear-gradient(135deg, #6C63FF, #00D4AA)',
          }}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : status === 'in_progress' ? (
            <><CheckCircle size={18} /> {cfg.action}</>
          ) : (
            <><Navigation size={18} /> {cfg.action}</>
          )}
        </button>
      </motion.div>
    </div>
  );
}
