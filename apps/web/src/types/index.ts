// ─── User & Auth ────────────────────────────────────────────────────────────

export type UserRole = 'passenger' | 'driver' | 'admin';

export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  avatar?: string;
  role: UserRole;
  rating: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
}

// ─── Location ────────────────────────────────────────────────────────────────

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
}

// ─── Driver ──────────────────────────────────────────────────────────────────

export type DriverStatus = 'offline' | 'online' | 'busy';
export type SubscriptionStatus = 'active' | 'inactive' | 'trial' | 'expired';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  category: VehicleCategory;
}

export type VehicleCategory = 'economy' | 'comfort' | 'premium' | 'minivan';

export interface Driver {
  id: string;
  user: User;
  vehicle: Vehicle;
  status: DriverStatus;
  currentLocation?: Coordinates;
  rating: number;
  ratingCount: number;
  totalRides: number;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt?: string;
  documentsVerified: boolean;
  backgroundCheckPassed: boolean;
  earnings: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
}

// ─── Trip & Offers ────────────────────────────────────────────────────────────

export type TripStatus =
  | 'searching'
  | 'negotiating'
  | 'accepted'
  | 'driver_arriving'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PaymentMethod = 'cash' | 'card';

export interface TripRoute {
  origin: Place;
  destination: Place;
  distance: number; // km
  duration: number; // minutes
  polyline?: string;
}

export interface Trip {
  id: string;
  passenger: User;
  driver?: Driver;
  route: TripRoute;
  status: TripStatus;
  proposedPrice: number;
  agreedPrice?: number;
  paymentMethod: PaymentMethod;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  passengerRating?: number;
  driverRating?: number;
  createdAt: string;
}

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'countered';

export interface Offer {
  id: string;
  tripId: string;
  driver: Driver;
  price: number;
  message?: string;
  estimatedArrival: number; // minutes
  status: OfferStatus;
  expiresAt: string;
  createdAt: string;
}

export interface CounterOffer {
  offerId: string;
  price: number;
  message?: string;
}

// ─── Schedule ────────────────────────────────────────────────────────────────

export interface ScheduledRide {
  id: string;
  trip: Trip;
  scheduledAt: string;
  status: 'pending' | 'matched' | 'cancelled';
  createdAt: string;
}

// ─── Payment ─────────────────────────────────────────────────────────────────

export interface PaymentCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface PaymentIntent {
  clientSecret: string;
  amount: number;
  currency: string;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId: string;
}

export interface Subscription {
  id: string;
  driverId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string;
}

// ─── Earnings ─────────────────────────────────────────────────────────────────

export interface EarningsEntry {
  date: string;
  amount: number;
  rides: number;
}

export interface EarningsSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
  byDay: EarningsEntry[];
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType = 'offer' | 'trip' | 'payment' | 'system' | 'promo';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

// ─── Socket Events ────────────────────────────────────────────────────────────

export interface SocketOffer {
  offer: Offer;
}

export interface SocketTripUpdate {
  tripId: string;
  status: TripStatus;
  driver?: Driver;
  location?: Coordinates;
}

export interface SocketDriverLocation {
  driverId: string;
  location: Coordinates;
  heading?: number;
}

export interface SocketError {
  message: string;
  code: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

export interface SelectOption<T = string> {
  label: string;
  value: T;
}

export type ThemeColor = 'accent' | 'secondary' | 'success' | 'warning' | 'error';

export interface BottomSheetState {
  isOpen: boolean;
  snap: 'collapsed' | 'half' | 'full';
}
