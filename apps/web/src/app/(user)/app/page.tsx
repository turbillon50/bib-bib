'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Clock } from 'lucide-react';
import { MapView } from '@/components/maps/MapView';
import { BottomSheet } from '@/components/ride/BottomSheet';
import { BottomNav } from '@/components/layout/BottomNav';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAuthStore } from '@/store/authStore';
import { useTripStore } from '@/store/tripStore';
import { api } from '@/lib/api';

export default function PassengerMapPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { activeRide } = useTripStore();
  const { location } = useGeolocation();

  const [nearbyDrivers, setNearbyDrivers] = useState<Array<{ id: string; latitude: number; longitude: number }>>([]);

  const center = location
    ? { lat: location.latitude, lng: location.longitude }
    : { lat: 19.4326, lng: -99.1332 };

  useEffect(() => {
    if (activeRide?.status === 'accepted' || activeRide?.status === 'driver_en_route') {
      router.push('/app/trip');
    }
    if (activeRide?.status === 'searching' || activeRide?.status === 'negotiating') {
      router.push('/app/offers');
    }
  }, [activeRide?.status]);

  useEffect(() => {
    if (!location) return;
    api
      .get('/drivers/nearby', {
        params: { lat: location.latitude, lng: location.longitude, radius: 5000 },
      })
      .then((res) => setNearbyDrivers(res.data?.data ?? []))
      .catch(() => {});
  }, [location?.latitude, location?.longitude]);

  return (
    <div className="flex min-h-screen max-w-[430px] mx-auto flex-col bg-background overflow-hidden">
      {/* Map area */}
      <div className="relative h-[42vh] w-full">
        <MapView
          center={center}
          userLocation={location ? { lat: location.latitude, lng: location.longitude } : undefined}
          drivers={nearbyDrivers}
          className="w-full h-full"
        />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 px-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-[rgba(17,17,24,0.9)] backdrop-blur-xl rounded-2xl px-3 py-2 border border-[rgba(255,255,255,0.08)]">
              <div className="w-7 h-7 rounded-lg bg-gradient-cta flex items-center justify-center">
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

        {/* Bottom gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Bottom sheet — always visible */}
      <BottomSheet nearbyDriversCount={nearbyDrivers.length} />

      <BottomNav role="passenger" />
    </div>
  );
}
