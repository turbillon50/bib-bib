'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapView } from '@/components/maps/MapView';
import { OnlineToggle } from '@/components/driver/OnlineToggle';
import { IncomingOfferModal } from '@/components/driver/IncomingOfferModal';
import { BottomNav } from '@/components/layout/BottomNav';
import { useSocket } from '@/hooks/useSocket';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useDriverStore } from '@/store/driverStore';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { AlertCircle } from '@/components/icons';

interface IncomingRide {
  rideId: string;
  originAddress: string;
  destinationAddress: string;
  proposedPrice: number;
  currency: string;
  expiresAt: string;
  distanceMeters?: number;
}

export default function DriverDashboard() {
  const { user } = useAuthStore();
  const { isOnline, setOnline, subscriptionStatus } = useDriverStore();
  const { socket } = useSocket();
  const { location, requestLocation } = useGeolocation();
  const [loading, setLoading] = useState(false);
  const [incomingRide, setIncomingRide] = useState<IncomingRide | null>(null);
  const [todayEarnings, setTodayEarnings] = useState(0);

  const center = location ? { lat: location.latitude, lng: location.longitude } : { lat: 19.4326, lng: -99.1332 };

  // Load earnings
  useEffect(() => {
    api.get('/drivers/me/earnings').then(res => {
      setTodayEarnings(res.data?.data?.today_gross ?? 0);
    }).catch(() => {});
  }, []);

  // Socket events
  useEffect(() => {
    if (!socket) return;
    socket.on('trip:new_request', (data: IncomingRide) => setIncomingRide(data));
    return () => { socket.off('trip:new_request'); };
  }, [socket]);

  // Location updates while online
  useEffect(() => {
    if (!isOnline || !socket || !location) return;
    const interval = setInterval(() => {
      socket.emit('driver:update_location', { latitude: location.latitude, longitude: location.longitude });
    }, 5000);
    return () => clearInterval(interval);
  }, [isOnline, socket, location?.latitude, location?.longitude]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (!isOnline) {
        await requestLocation();
        await api.put('/drivers/me/status', {
          isOnline: true,
          latitude: location?.latitude,
          longitude: location?.longitude,
        });
        setOnline(true);
        socket?.emit('driver:go_online', { latitude: location?.latitude, longitude: location?.longitude });
      } else {
        await api.put('/drivers/me/status', { isOnline: false });
        setOnline(false);
        socket?.emit('driver:go_offline');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('subscription')) alert('Necesitas una suscripción activa para recibir viajes');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (rideId: string, _price: number) => {
    await api.post('/offers', {
      rideId, offeredPrice: _price, offerType: 'accept',
    }).catch(() => {});
    setIncomingRide(null);
  };

  const handleCounter = async (rideId: string, price: number) => {
    await api.post('/offers', {
      rideId, offeredPrice: price, offerType: 'counter',
    }).catch(() => {});
    setIncomingRide(null);
  };

  const handleReject = (rideId: string) => {
    setIncomingRide(null);
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background md:pl-20">
      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          center={center}
          userLocation={location ? { lat: location.latitude, lng: location.longitude } : undefined}
          className="w-full h-full"
        />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 safe-top px-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-surface/90 px-3 py-2.5 backdrop-blur-xl">
              <img src="/brand/driver.jpg" alt="" className="h-10 w-10 rounded-xl object-cover" />
              <div>
                <div className="text-xs text-[#8B8B9E]">Hoy</div>
                <div className="bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] bg-clip-text font-mono text-lg font-black text-transparent">
                  ${todayEarnings.toFixed(2)}
                </div>
              </div>
            </div>
            {subscriptionStatus !== 'active' && (
              <div className="flex items-center gap-2 bg-[rgba(255,71,87,0.15)] border border-[rgba(255,71,87,0.3)] rounded-2xl px-3 py-2">
                <AlertCircle size={14} className="text-[#FF4757]" />
                <span className="text-xs text-[#FF4757] font-medium">Sin suscripción</span>
              </div>
            )}
          </div>
        </div>

        {/* Online toggle */}
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2">
          <div className="bg-[rgba(17,17,24,0.95)] backdrop-blur-xl rounded-3xl px-8 py-5 border border-[rgba(255,255,255,0.08)]">
            <OnlineToggle
              isOnline={isOnline}
              onToggle={handleToggle}
              loading={loading}
              disabled={subscriptionStatus !== 'active'}
            />
          </div>
        </div>
      </div>

      {/* Incoming ride modal */}
      <IncomingOfferModal
        ride={incomingRide}
        onAccept={handleAccept}
        onCounter={handleCounter}
        onReject={handleReject}
      />

      <BottomNav role="driver" />
    </div>
  );
}
