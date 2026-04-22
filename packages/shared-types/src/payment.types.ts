export type PaymentType = 'ride_passenger' | 'trip_fee_driver' | 'subscription';
export type PaymentRecordStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  rideId?: string;
  userId: string;
  driverId?: string;
  paymentType: PaymentType;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: PaymentRecordStatus;
  stripePaymentIntentId?: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  driverId: string;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  monthlyAmount: number;
  currency: string;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  stripePriceId: string;
  features: string[];
  tripFeeAmount: number;
}
