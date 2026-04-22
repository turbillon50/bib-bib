export type OfferType = 'accept' | 'counter';
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'withdrawn';

export interface Offer {
  id: string;
  rideId: string;
  driverId: string;
  offeredPrice: number;
  offerType: OfferType;
  status: OfferStatus;
  message?: string;
  driverEtaSeconds?: number;
  expiresAt: string;
  createdAt: string;
  driver?: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    ratingAverage: number;
    totalTrips: number;
    vehicle?: {
      make: string;
      model: string;
      color: string;
      plateNumber: string;
    };
  };
}

export interface CreateOfferDto {
  rideId: string;
  offeredPrice: number;
  offerType: OfferType;
  message?: string;
  driverEtaSeconds?: number;
}
