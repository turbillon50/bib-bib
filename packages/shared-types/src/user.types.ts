export type UserRole = 'passenger' | 'driver' | 'admin';

export interface User {
  id: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: UserRole;
  isActive: boolean;
  stripeCustomerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface RegisterPassengerDto {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginDto {
  emailOrPhone: string;
  password: string;
}

export interface PaymentMethod {
  id: string;
  stripePaymentMethodId: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}
