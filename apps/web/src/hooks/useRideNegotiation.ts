'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore } from '@/store/tripStore';
import { useAuthStore } from '@/store/authStore';
import { useSocketEvent, useSocketEmit } from '@/hooks/useSocket';
import { SOCKET_EVENTS } from '@/lib/socket';
import { api } from '@/lib/api';
import { Offer, Trip, SocketOffer, SocketTripUpdate, SocketDriverLocation, Place, PaymentMethod } from '@/types';

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
    activeTrip,
    tripStatus,
    setActiveTrip,
    setTripStatus,
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
      // Navigate to offers page if not already there
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
    handler: ({ tripId, status, driver }) => {
      setTripStatus(status);
      if (activeTrip && driver) {
        setActiveTrip({ ...activeTrip, driver, status });
      }

      if (status === 'accepted') {
        clearOffers();
        router.push('/app/trip');
      } else if (status === 'completed') {
        setTimeout(() => {
          resetTrip();
          router.push('/app/history');
        }, 3000);
      } else if (status === 'cancelled') {
        setTimeout(() => {
          resetTrip();
          router.push('/app');
        }, 2000);
      }
    },
    enabled: !!activeTrip,
  });

  useSocketEvent<SocketDriverLocation>({
    event: SOCKET_EVENTS.LOCATION_UPDATE,
    handler: ({ location }) => {
      setDriverLocation(location);
    },
    enabled: !!activeTrip,
  });

  // ─── Actions ────────────────────────────────────────────────────────────────

  const requestRide = useCallback(async () => {
    if (!origin || !destination || !user) return;

    setIsRequesting(true);
    try {
      const trip = await api.post<Trip>('/trips', {
        originPlaceId: origin.id,
        originName: origin.name,
        originAddress: origin.address,
        originLat: origin.coordinates.lat,
        originLng: origin.coordinates.lng,
        destinationPlaceId: destination.id,
        destinationName: destination.name,
        destinationAddress: destination.address,
        destinationLat: destination.coordinates.lat,
        destinationLng: destination.coordinates.lng,
        proposedPrice,
        paymentMethod,
      });

      setActiveTrip(trip);
      setTripStatus('searching');
      clearOffers();

      emit(SOCKET_EVENTS.REQUEST_RIDE, { tripId: trip.id });
      setIsSearching(true);

      router.push('/app/offers');
    } catch (error) {
      console.error('Failed to request ride:', error);
      throw error;
    } finally {
      setIsRequesting(false);
    }
  }, [
    origin,
    destination,
    user,
    proposedPrice,
    paymentMethod,
    emit,
    router,
    setActiveTrip,
    setTripStatus,
    clearOffers,
    setIsRequesting,
    setIsSearching,
  ]);

  const acceptOffer = useCallback(
    async (offer: Offer) => {
      if (!activeTrip) return;
      try {
        setSelectedOffer(offer);
        await api.post(`/trips/${activeTrip.id}/offers/${offer.id}/accept`);
        emit(SOCKET_EVENTS.ACCEPT_OFFER, { tripId: activeTrip.id, offerId: offer.id });
        setTripStatus('accepted');
      } catch (error) {
        console.error('Failed to accept offer:', error);
        throw error;
      }
    },
    [activeTrip, emit, setSelectedOffer, setTripStatus],
  );

  const rejectOffer = useCallback(
    async (offerId: string) => {
      if (!activeTrip) return;
      try {
        await api.post(`/trips/${activeTrip.id}/offers/${offerId}/reject`);
        emit(SOCKET_EVENTS.REJECT_OFFER, { tripId: activeTrip.id, offerId });
        updateOffer(offerId, { status: 'rejected' });
        removeOffer(offerId);
      } catch (error) {
        console.error('Failed to reject offer:', error);
        throw error;
      }
    },
    [activeTrip, emit, updateOffer, removeOffer],
  );

  const counterOffer = useCallback(
    async (offerId: string, counterPrice: number, message?: string) => {
      if (!activeTrip) return;
      try {
        const updated = await api.post<Offer>(
          `/trips/${activeTrip.id}/offers/${offerId}/counter`,
          { price: counterPrice, message },
        );
        emit(SOCKET_EVENTS.COUNTER_OFFER, {
          tripId: activeTrip.id,
          offerId,
          price: counterPrice,
          message,
        });
        updateOffer(offerId, { ...updated, status: 'countered' });
      } catch (error) {
        console.error('Failed to counter offer:', error);
        throw error;
      }
    },
    [activeTrip, emit, updateOffer],
  );

  const cancelRide = useCallback(async () => {
    if (!activeTrip) return;
    try {
      await api.post(`/trips/${activeTrip.id}/cancel`);
      emit(SOCKET_EVENTS.CANCEL_RIDE, { tripId: activeTrip.id });
      resetTrip();
      router.push('/app');
    } catch (error) {
      console.error('Failed to cancel ride:', error);
      throw error;
    }
  }, [activeTrip, emit, resetTrip, router]);

  return {
    // State
    origin,
    destination,
    proposedPrice,
    paymentMethod,
    offers,
    activeTrip,
    tripStatus,

    // Actions
    requestRide,
    acceptOffer,
    rejectOffer,
    counterOffer,
    cancelRide,
  };
};
