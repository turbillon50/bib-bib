'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore } from '@/store/tripStore';
import { useAuthStore } from '@/store/authStore';
import { useSocketEvent, useSocketEmit } from '@/hooks/useSocket';
import { SOCKET_EVENTS } from '@/lib/socket';
import { api } from '@/lib/api';
import { Offer, SocketOffer, SocketTripUpdate, SocketDriverLocation } from '@/types';

export const useRideNegotiation = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const { emit } = useSocketEmit();

  const {
    origin,
    destination,
    proposedPrice,
    paymentMethod,
    offers,
    activeRide,
    setActiveRide,
    addOffer,
    updateOffer,
    removeOffer,
    clearOffers,
    setSelectedOffer,
    setDriverLocation,
    setIsSearching,
    setIsRequesting,
    resetTrip,
  } = useTripStore();

  // ─── Socket event listeners ────────────────────────────────────────────────

  useSocketEvent<SocketOffer>({
    event: SOCKET_EVENTS.OFFER_RECEIVED,
    handler: ({ offer }) => {
      addOffer(offer);
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/offers')) {
        router.push('/app/offers');
      }
    },
    enabled: !!user && user.role === 'passenger',
  });

  useSocketEvent<SocketOffer>({
    event: SOCKET_EVENTS.OFFER_UPDATED,
    handler: ({ offer }) => {
      updateOffer(offer.id, offer);
    },
    enabled: !!user && user.role === 'passenger',
  });

  useSocketEvent<{ offerId: string }>({
    event: SOCKET_EVENTS.OFFER_EXPIRED,
    handler: ({ offerId }) => {
      updateOffer(offerId, { status: 'expired' });
    },
    enabled: !!user && user.role === 'passenger',
  });

  useSocketEvent<SocketTripUpdate>({
    event: SOCKET_EVENTS.TRIP_UPDATED,
    handler: ({ status }) => {
      if (activeRide) {
        setActiveRide({ ...activeRide, status });
      }
      if (status === 'accepted') {
        clearOffers();
        router.push('/app/trip');
      } else if (status === 'completed') {
        setTimeout(() => { resetTrip(); router.push('/app/history'); }, 3000);
      } else if (status === 'cancelled') {
        setTimeout(() => { resetTrip(); router.push('/app'); }, 2000);
      }
    },
    enabled: !!activeRide,
  });

  useSocketEvent<SocketDriverLocation>({
    event: SOCKET_EVENTS.LOCATION_UPDATE,
    handler: ({ location }) => {
      setDriverLocation(location);
    },
    enabled: !!activeRide,
  });

  // ─── Actions ────────────────────────────────────────────────────────────────

  const requestRide = useCallback(async () => {
    if (!origin || !destination || !user) return;
    setIsRequesting(true);
    try {
      const res = await api.post('/rides', {
        originAddress: origin.address,
        originLatitude: origin.coordinates.lat,
        originLongitude: origin.coordinates.lng,
        destinationAddress: destination.address,
        destinationLatitude: destination.coordinates.lat,
        destinationLongitude: destination.coordinates.lng,
        proposedPrice,
        paymentMethod,
      });
      setActiveRide(res?.data?.ride ?? res);
      clearOffers();
      setIsSearching(true);
      router.push('/app/offers');
    } catch (error) {
      console.error('Failed to request ride:', error);
      throw error;
    } finally {
      setIsRequesting(false);
    }
  }, [origin, destination, user, proposedPrice, paymentMethod, emit, router, setActiveRide, clearOffers, setIsRequesting, setIsSearching]);

  const acceptOffer = useCallback(
    async (offer: Offer) => {
      if (!activeRide) return;
      try {
        setSelectedOffer(offer);
        await api.post(`/offers/${offer.id}/accept`);
        emit(SOCKET_EVENTS.ACCEPT_OFFER, { rideId: activeRide.id, offerId: offer.id });
      } catch (error) {
        console.error('Failed to accept offer:', error);
        throw error;
      }
    },
    [activeRide, emit, setSelectedOffer],
  );

  const rejectOffer = useCallback(
    async (offerId: string) => {
      if (!activeRide) return;
      try {
        await api.put(`/offers/${offerId}/reject`);
        updateOffer(offerId, { status: 'rejected' });
        removeOffer(offerId);
      } catch (error) {
        console.error('Failed to reject offer:', error);
        throw error;
      }
    },
    [activeRide, updateOffer, removeOffer],
  );

  const cancelRide = useCallback(async () => {
    if (!activeRide) return;
    try {
      await api.post(`/rides/${activeRide.id}/cancel`);
      emit(SOCKET_EVENTS.CANCEL_RIDE, { rideId: activeRide.id });
      resetTrip();
      router.push('/app');
    } catch (error) {
      console.error('Failed to cancel ride:', error);
      throw error;
    }
  }, [activeRide, emit, resetTrip, router]);

  return {
    origin,
    destination,
    proposedPrice,
    paymentMethod,
    offers,
    activeRide,
    requestRide,
    acceptOffer,
    rejectOffer,
    cancelRide,
  };
};
