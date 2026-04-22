export type SubscriptionStatus = 'active' | 'inactive' | 'past_due' | 'canceled' | 'trialing';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type DocumentType = 'id_front' | 'id_back' | 'license_front' | 'license_back' | 'vehicle_registration' | 'insurance' | 'photo_selfie';
export type DocumentStatus = 'pending' | 'approved' | 'rejected';

export interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  ratingAverage: number;
  ratingCount: number;
  totalTrips: number;
  totalEarnings: number;
  isOnline: boolean;
  isApproved: boolean;
  approvalStatus: ApprovalStatus;
  currentLatitude?: number;
  currentLongitude?: number;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPeriodEnd?: string;
  createdAt: string;
}

export interface DriverProfile extends Driver {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  vehicle?: Vehicle;
  documents?: DriverDocument[];
}

export interface Vehicle {
  id: string;
  driverId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  vehicleType: 'sedan' | 'suv' | 'van' | 'motorcycle';
  capacity: number;
  photoUrl?: string;
  isActive: boolean;
}

export interface DriverDocument {
  id: string;
  driverId: string;
  documentType: DocumentType;
  fileUrl: string;
  status: DocumentStatus;
  rejectionReason?: string;
  createdAt: string;
}

export interface DriverEarnings {
  todayGross: number;
  todayFees: number;
  todayNet: number;
  weekGross: number;
  weekFees: number;
  weekNet: number;
  monthGross: number;
  monthFees: number;
  monthNet: number;
  totalTrips: number;
}

export interface NearbyDriver {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  ratingAverage: number;
  latitude: number;
  longitude: number;
  vehicle?: {
    make: string;
    model: string;
    color: string;
    plateNumber: string;
    vehicleType: string;
  };
}
