import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Trip, Offer, EarningsSummary, Coordinates } from '@/types';

interface DriverStore {
  isOnline: boolean;
  currentLocation: Coordinates | null;
  activeTrip: Trip | null;
  incomingOffer: Trip | null; // Pending ride request to accept/reject
  pendingOffers: Offer[]; // Offers driver submitted, waiting for passenger

  earnings: EarningsSummary | null;
  todayRides: number;

  // UI state
  showIncomingModal: boolean;

  // Actions
  setOnline: (online: boolean) => void;
  setCurrentLocation: (coords: Coordinates | null) => void;
  setActiveTrip: (trip: Trip | null) => void;
  setIncomingOffer: (trip: Trip | null) => void;
  setShowIncomingModal: (show: boolean) => void;
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
      name: 'rideme-driver',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isOnline: state.isOnline,
        todayRides: state.todayRides,
      }),
    },
  ),
);
