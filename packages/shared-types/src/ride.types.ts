export type RideStatus =
  | 'scheduled'
  | 'searching'
  | 'negotiating'
  | 'accepted'
  | 'driver_en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'canceled'
  | 'expired';

export type PaymentMethod = 'cash' | 'card';
export type PaymentStatus = 'pending' | 'charged' | 'failed' | 'refunded';
export type RideType = 'standard' | 'premium';

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export interface Ride {
  id: string;
  passengerId: string;
  driverId?: string;
  origin: Location;
  destination: Location;
  distanceMeters?: number;
  durationSeconds?: number;
  proposedPrice: number;
  finalPrice?: number;
  currency: string;
  status: RideStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  isScheduled: boolean;
  scheduledFor?: string;
  rideType: RideType;
  polyline?: string;
  startedAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  canceledAt?: string;
  cancelReason?: string;
  createdAt: string;
}

export interface CreateRideDto {
  originAddress: string;
  originLatitude: number;
  originLongitude: number;
  destinationAddress: string;
  destinationLatitude: number;
  destinationLongitude: number;
  proposedPrice: number;
  paymentMethod: PaymentMethod;
  isScheduled?: boolean;
  scheduledFor?: string;
  rideType?: RideType;
}

export interface FareEstimate {
  minPrice: number;
  maxPrice: number;
  suggestedPrice: number;
  distanceMeters: number;
  durationSeconds: number;
  currency: string;
}

export interface Rating {
  id: string;
  rideId: string;
  stars: number;
  comment?: string;
  tags?: string[];
  createdAt: string;
}
