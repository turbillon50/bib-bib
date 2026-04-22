import { create } from 'zustand';
import { Offer, PaymentMethod, Place, Coordinates, ActiveRide } from '@/types';

interface TripStore {
  // Active ride (API response shape)
  activeRide: ActiveRide | null;

  // Ride request state
  origin: Place | null;
  destination: Place | null;
  proposedPrice: number;
  paymentMethod: PaymentMethod;

  // Offers
  offers: Offer[];
  selectedOffer: Offer | null;

  // Driver location (real-time)
  driverLocation: Coordinates | null;

  // UI state
  isRequesting: boolean;
  isSearching: boolean;
  bottomSheetSnap: 'collapsed' | 'half' | 'full';

  // Actions
  setOrigin: (place: Place | null) => void;
  setDestination: (place: Place | null) => void;
  setProposedPrice: (price: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setActiveRide: (ride: ActiveRide | null) => void;
  addOffer: (offer: Offer) => void;
  updateOffer: (offerId: string, updates: Partial<Offer>) => void;
  removeOffer: (offerId: string) => void;
  clearOffers: () => void;
  setSelectedOffer: (offer: Offer | null) => void;
  setDriverLocation: (coords: Coordinates | null) => void;
  setIsRequesting: (v: boolean) => void;
  setIsSearching: (v: boolean) => void;
  setBottomSheetSnap: (snap: 'collapsed' | 'half' | 'full') => void;
  resetTrip: () => void;
}

const initialState = {
  activeRide: null,
  origin: null,
  destination: null,
  proposedPrice: 10,
  paymentMethod: 'cash' as PaymentMethod,
  offers: [],
  selectedOffer: null,
  driverLocation: null,
  isRequesting: false,
  isSearching: false,
  bottomSheetSnap: 'half' as const,
};

export const useTripStore = create<TripStore>((set) => ({
  ...initialState,

  setOrigin: (place) => set({ origin: place }),
  setDestination: (place) => set({ destination: place }),
  setProposedPrice: (price) => set({ proposedPrice: price }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setActiveRide: (ride) => set({ activeRide: ride }),

  addOffer: (offer) =>
    set((state) => {
      const exists = state.offers.find((o) => o.id === offer.id);
      if (exists) return state;
      return { offers: [offer, ...state.offers] };
    }),

  updateOffer: (offerId, updates) =>
    set((state) => ({
      offers: state.offers.map((o) => (o.id === offerId ? { ...o, ...updates } : o)),
    })),

  removeOffer: (offerId) =>
    set((state) => ({
      offers: state.offers.filter((o) => o.id !== offerId),
    })),

  clearOffers: () => set({ offers: [] }),
  setSelectedOffer: (offer) => set({ selectedOffer: offer }),
  setDriverLocation: (coords) => set({ driverLocation: coords }),
  setIsRequesting: (v) => set({ isRequesting: v }),
  setIsSearching: (v) => set({ isSearching: v }),
  setBottomSheetSnap: (snap) => set({ bottomSheetSnap: snap }),

  resetTrip: () => set(initialState),
}));
