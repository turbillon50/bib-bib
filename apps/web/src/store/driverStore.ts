import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Offer, EarningsSummary, Coordinates, ActiveRide } from '@/types';

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'inactive';

interface DriverStore {
  isOnline: boolean;
  currentLocation: Coordinates | null;
  activeTrip: ActiveRide | null;
  incomingOffer: ActiveRide | null;
  pendingOffers: Offer[];
  subscriptionStatus: SubscriptionStatus;
  earnings: EarningsSummary | null;
  todayRides: number;
  showIncomingModal: boolean;

  // Actions
  setOnline: (online: boolean) => void;
  setCurrentLocation: (coords: Coordinates | null) => void;
  setActiveTrip: (trip: ActiveRide | null) => void;
  setIncomingOffer: (trip: ActiveRide | null) => void;
  setShowIncomingModal: (show: boolean) => void;
  setSubscriptionStatus: (status: SubscriptionStatus) => void;
  addPendingOffer: (offer: Offer) => void;
  removePendingOffer: (offerId: string) => void;
  updatePendingOffer: (offerId: string, updates: Partial<Offer>) => void;
  setEarnings: (earnings: EarningsSummary) => void;
  incrementTodayRides: () => void;
  resetDriverState: () => void;
}

const initialState = {
  isOnline: false,
  currentLocation: null,
  activeTrip: null,
  incomingOffer: null,
  pendingOffers: [],
  subscriptionStatus: 'inactive' as SubscriptionStatus,
  earnings: null,
  todayRides: 0,
  showIncomingModal: false,
};

export const useDriverStore = create<DriverStore>()(
  persist(
    (set) => ({
      ...initialState,

      setOnline: (online) => set({ isOnline: online }),
      setCurrentLocation: (coords) => set({ currentLocation: coords }),
      setActiveTrip: (trip) => set({ activeTrip: trip }),

      setIncomingOffer: (trip) =>
        set({ incomingOffer: trip, showIncomingModal: trip !== null }),

      setShowIncomingModal: (show) => set({ showIncomingModal: show }),
      setSubscriptionStatus: (status) => set({ subscriptionStatus: status }),

      addPendingOffer: (offer) =>
        set((state) => ({
          pendingOffers: [...state.pendingOffers, offer],
        })),

      removePendingOffer: (offerId) =>
        set((state) => ({
          pendingOffers: state.pendingOffers.filter((o) => o.id !== offerId),
        })),

      updatePendingOffer: (offerId, updates) =>
        set((state) => ({
          pendingOffers: state.pendingOffers.map((o) =>
            o.id === offerId ? { ...o, ...updates } : o,
          ),
        })),

      setEarnings: (earnings) => set({ earnings }),
      incrementTodayRides: () =>
        set((state) => ({ todayRides: state.todayRides + 1 })),

      resetDriverState: () => set(initialState),
    }),
    {
      name: 'bib-bib-driver',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isOnline: state.isOnline,
        subscriptionStatus: state.subscriptionStatus,
        todayRides: state.todayRides,
      }),
    },
  ),
);
