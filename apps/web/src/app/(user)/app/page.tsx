'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, ChevronUp, Minus, Plus, Clock, CreditCard, Banknote } from 'lucide-react';
import { MapView } from '@/components/maps/MapView';
import { BottomNav } from '@/components/layout/BottomNav';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/authStore';
import { useTripStore } from '@/store/tripStore';
import { api } from '@/lib/api';

type PaymentMethod = 'cash' | 'card';

export default function PassengerMapPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { activeRide } = useTripStore();
  const { location } = useGeolocation();
  const { socket } = useSocket();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [proposedPrice, setProposedPrice] = useState(10);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [fareEstimate, setFareEstimate] = useState<{ min: number; max: number; suggested: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [nearbyDrivers, setNearbyDrivers] = useState<Array<{ id: string; latitude: number; longitude: number }>>([]);

  const center = location ? { lat: location.latitude, lng: location.longitude } : { lat: 19.4326, lng: -99.1332 };

  // Redirect if active ride
  useEffect(() => {
    if (activeRide?.status === 'accepted' || activeRide?.status === 'driver_en_route') {
      router.push(`/app/trip`);
    }
    if (activeRide?.status === 'searching' || activeRide?.status === 'negotiating') {
      router.push(`/app/offers`);
    }
  }, [activeRide?.status]);

  // Load nearby drivers
  useEffect(() => {
    if (!location) return;
    api.get('/drivers/nearby', {
      params: { lat: location.latitude, lng: location.longitude, radius: 5000 }
    }).then(res => setNearbyDrivers(res.data?.data ?? [])).catch(() => {});
  }, [location?.latitude, location?.longitude]);

  // Fare estimate when route set
  useEffect(() => {
    if (!location || !destination) return;
    const timeout = setTimeout(async () => {
      try {
        const res = await api.get('/rides/fare-estimate', {
          params: {
            originLat: location.latitude, originLng: location.longitude,
            destLat: center.lat + 0.01, destLng: center.lng + 0.01,
          }
        });
        const d = res.data?.data;
        if (d) {
          setFareEstimate({ min: d.minPrice, max: d.maxPrice, suggested: d.suggestedPrice });
          setProposedPrice(d.suggestedPrice);
        }
      } catch {}
    }, 500);
    return () => clearTimeout(timeout);
  }, [destination]);

  const handleRequestRide = async () => {
    if (!origin || !destination) return;
    setLoading(true);
    try {
      const res = await api.post('/rides', {
        originAddress: origin,
        originLatitude: location?.latitude ?? center.lat,
        originLongitude: location?.longitude ?? center.lng,
        destinationAddress: destination,
        destinationLatitude: center.lat + 0.01,
        destinationLongitude: center.lng + 0.01,
        proposedPrice,
        paymentMethod,
        isScheduled: false,
      });
      const { setActiveRide } = useTripStore.getState();
      setActiveRide(res.data?.data?.ride);
      router.push('/app/offers');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#0A0A0F] flex flex-col overflow-hidden">
      {/* Map full screen */}
      <div className="flex-1 relative">
        <MapView
          center={center}
          userLocation={location ? { lat: location.latitude, lng: location.longitude } : undefined}
          drivers={nearbyDrivers}
          className="w-full h-full"
        />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 safe-top px-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-[rgba(17,17,24,0.9)] backdrop-blur-xl rounded-2xl px-3 py-2 border border-[rgba(255,255,255,0.08)]">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] flex items-center justify-center">
                <MapPin size={13} className="text-white" />
              </div>
              <span className="font-bold text-sm">RideMe</span>
            </div>
            <button
              onClick={() => router.push('/app/schedule')}
              className="flex items-center gap-1.5 bg-[rgba(17,17,24,0.9)] backdrop-blur-xl rounded-2xl px-3 py-2 border border-[rgba(255,255,255,0.08)] text-sm text-[#8B8B9E] hover:text-white transition-colors"
            >
              <Clock size={14} />
              Programar
            </button>
          </div>
        </div>

        {/* Sheet toggle */}
        {!sheetOpen && (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={() => setSheetOpen(true)}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-[0_8px_32px_rgba(108,99,255,0.4)]"
          >
            <Navigation size={16} />
            ¿A dónde vas?
            <ChevronUp size={16} />
          </motion.button>
        )}
      </div>

      {/* Bottom sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="absolute bottom-0 left-0 right-0 bg-[#111118] border-t border-[rgba(255,255,255,0.08)] rounded-t-3xl pb-20 z-30"
          >
            <div className="px-5 pt-4 pb-2">
              <div className="sheet-handle" />
              <h3 className="font-bold text-lg mb-4">Pedir viaje</h3>

              {/* Origin */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3 bg-[#1A1A24] rounded-2xl px-4 py-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#6C63FF] flex-shrink-0" />
                  <input
                    value={origin} onChange={e => setOrigin(e.target.value)}
                    placeholder="¿De dónde sales?"
                    className="flex-1 bg-transparent text-sm text-white placeholder-[#4A4A5A] focus:outline-none"
                  />
                  {location && (
                    <button onClick={() => setOrigin('Mi ubicación actual')} className="text-[#6C63FF]">
                      <Navigation size={15} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 bg-[#1A1A24] rounded-2xl px-4 py-3">
                  <MapPin size={14} className="text-[#00D4AA] flex-shrink-0" />
                  <input
                    value={destination} onChange={e => setDestination(e.target.value)}
                    placeholder="¿A dónde vas?"
                    className="flex-1 bg-transparent text-sm text-white placeholder-[#4A4A5A] focus:outline-none"
                  />
                </div>
              </div>

              {/* Price */}
              {fareEstimate && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#8B8B9E]">Tu precio propuesto</span>
                    <span className="text-xs text-[#8B8B9E]">Sugerido: ${fareEstimate.suggested.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setProposedPrice(p => Math.max(p - 0.5, fareEstimate.min))}
                      className="w-10 h-10 rounded-xl bg-[#1A1A24] flex items-center justify-center hover:bg-[#24243A] transition-colors">
                      <Minus size={16} />
                    </button>
                    <div className="flex-1 text-center">
                      <span className="text-3xl font-black font-mono bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] bg-clip-text text-transparent">
                        ${proposedPrice.toFixed(2)}
                      </span>
                    </div>
                    <button onClick={() => setProposedPrice(p => Math.min(p + 0.5, fareEstimate.max * 2))}
                      className="w-10 h-10 rounded-xl bg-[#1A1A24] flex items-center justify-center hover:bg-[#24243A] transition-colors">
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-[#4A4A5A]">
                    <span>Mín ${fareEstimate.min.toFixed(2)}</span>
                    <span>Máx ${fareEstimate.max.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Payment */}
              <div className="flex gap-2 mb-4">
                {([['cash', Banknote, 'Efectivo'], ['card', CreditCard, 'Tarjeta']] as const).map(([method, Icon, label]) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      paymentMethod === method
                        ? 'border-[#6C63FF] bg-[rgba(108,99,255,0.1)] text-[#6C63FF]'
                        : 'border-[rgba(255,255,255,0.08)] text-[#8B8B9E] hover:border-[rgba(108,99,255,0.3)]'
                    }`}
                  >
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleRequestRide}
                disabled={!origin || !destination || loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Buscar chofer'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav role="passenger" />
    </div>
  );
}
