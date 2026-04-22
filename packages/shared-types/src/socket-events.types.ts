import type { Offer } from './offer.types';
import type { NearbyDriver } from './driver.types';

// Events emitted from Server to Client
export interface ServerToClientEvents {
  authenticated: (data: { userId: string; role: string }) => void;
  auth_error: (data: { message: string }) => void;

  // Ride lifecycle
  'trip:new_request': (data: TripNewRequestPayload) => void;
  'trip:offer_received': (data: TripOfferReceivedPayload) => void;
  'trip:offer_expired': (data: { offerId: string }) => void;
  'trip:accepted': (data: TripAcceptedPayload) => void;
  'trip:driver_en_route': (data: { rideId: string; eta: number }) => void;
  'trip:driver_arrived': (data: { rideId: string; timestamp: string }) => void;
  'trip:started': (data: { rideId: string; startedAt: string }) => void;
  'trip:completed': (data: TripCompletedPayload) => void;
  'trip:canceled': (data: { rideId: string; reason: string; canceledBy: string }) => void;
  'trip:expired': (data: { rideId: string }) => void;

  // Location
  'driver:location_updated': (data: DriverLocationPayload) => void;
  'drivers:nearby_update': (data: { drivers: NearbyDriver[] }) => void;

  // Offers
  'offer:updated': (data: { offerId: string; status: string }) => void;
  'offer:expired': (data: { offerId: string }) => void;

  // WebRTC calling
  'call:incoming': (data: CallIncomingPayload) => void;
  'call:sdp_offer': (data: { callId: string; sdp: string }) => void;
  'call:sdp_answer': (data: { callId: string; sdp: string }) => void;
  'call:ice_candidate': (data: { callId: string; candidate: RTCIceCandidate }) => void;
  'call:ended': (data: { callId: string }) => void;
  'call:rejected': (data: { callId: string }) => void;

  // Notifications
  'notification:new': (data: NotificationPayload) => void;
  'payment:processed': (data: { rideId: string; amount: number; status: string }) => void;
  'subscription:updated': (data: { status: string; periodEnd: string }) => void;
}

// Events emitted from Client to Server
export interface ClientToServerEvents {
  authenticate: (data: { token: string }) => void;

  // Driver location
  'driver:go_online': (data: { latitude: number; longitude: number }) => void;
  'driver:go_offline': () => void;
  'driver:update_location': (data: { latitude: number; longitude: number; heading?: number }) => void;

  // Ride
  'ride:join': (data: { rideId: string }) => void;
  'ride:arrived_pickup': (data: { rideId: string }) => void;
  'ride:start': (data: { rideId: string }) => void;
  'ride:complete': (data: { rideId: string }) => void;

  // Offers
  'offer:submit': (data: { rideId: string; offeredPrice: number; offerType: 'accept' | 'counter'; message?: string }) => void;
  'offer:withdraw': (data: { offerId: string }) => void;
  'offer:accept': (data: { offerId: string }) => void;
  'offer:reject': (data: { offerId: string }) => void;

  // WebRTC
  'call:initiate': (data: { rideId: string; calleeId: string }) => void;
  'call:sdp_offer': (data: { rideId: string; callId: string; sdp: string }) => void;
  'call:sdp_answer': (data: { rideId: string; callId: string; sdp: string }) => void;
  'call:ice_candidate': (data: { rideId: string; callId: string; candidate: RTCIceCandidate }) => void;
  'call:end': (data: { callId: string }) => void;
  'call:reject': (data: { callId: string }) => void;
}

// Payload types
export interface TripNewRequestPayload {
  rideId: string;
  passengerId: string;
  passengerName: string;
  originAddress: string;
  originLatitude: number;
  originLongitude: number;
  destinationAddress: string;
  destinationLatitude: number;
  destinationLongitude: number;
  proposedPrice: number;
  currency: string;
  distanceMeters?: number;
  durationSeconds?: number;
  expiresAt: string;
}

export interface TripOfferReceivedPayload {
  offer: Offer;
}

export interface TripAcceptedPayload {
  rideId: string;
  driverId: string;
  driverName: string;
  driverAvatar?: string;
  driverRating: number;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  vehiclePlate: string;
  finalPrice: number;
  etaSeconds?: number;
}

export interface TripCompletedPayload {
  rideId: string;
  finalPrice: number;
  currency: string;
  durationSeconds: number;
  distanceMeters: number;
}

export interface DriverLocationPayload {
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  timestamp: string;
}

export interface CallIncomingPayload {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  rideId: string;
}

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}
