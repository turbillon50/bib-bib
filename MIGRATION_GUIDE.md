# RideMe Production Refactoring - Migration Guide

## Overview
This document outlines the migration from Firebase Auth + Twilio SMS to **Clerk Authentication** + **Resend Email** notifications for the RideMe rideshare application.

## Changes Made

### 1. Backend Dependencies
**Installed:**
- `@clerk/backend` - Clerk SDK for backend token verification
- `resend` - Email service for notifications
- `stripe` - Already configured, validated for integration

**Removed:**
- `firebase-admin` - Firebase Admin SDK
- `twilio` - Twilio SMS service

### 2. Environment Configuration

**Removed Variables:**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

**Added Variables:**
- `CLERK_SECRET_KEY` - Backend Clerk secret
- `RESEND_API_KEY` - Email service API key
- `RESEND_FROM_EMAIL` - Email sender address

**Updated Variables:**
- `JWT_ACCESS_SECRET` → renamed from `JWT_SECRET`
- `JWT_REFRESH_SECRET` → kept as is
- `JWT_ACCESS_EXPIRES_IN` → renamed from `JWT_ACCESS_EXPIRY`
- `JWT_REFRESH_EXPIRES_IN` → renamed from `JWT_REFRESH_EXPIRY`

### 3. Database Schema Changes

**New Migration:** `002_clerk_migration.sql`

**Changes:**
- Added `clerk_id` column to users table (unique identifier from Clerk)
- Added `email_verified_at` column (email verification tracking)
- Added `last_login` column (user activity tracking)
- Renamed `first_name` to `name` (simplified naming)
- Removed `last_name` column
- Renamed `avatar_url` to `image_url` (consistency)
- Created `notification_logs` table for email/notification history
- Created `auth_sessions` table for token management

**Future Cleanup (after data migration):**
- Remove `password_hash` column (Clerk handles passwords)
- Remove `fcm_token` column (email replaces push notifications)
- Drop `otp_codes` table (Clerk handles email verification)

### 4. Service Refactoring

#### Authentication Service (`auth.service.ts`)
**Removed Functions:**
- `hashPassword()` - Clerk handles password hashing
- `comparePassword()` - Clerk handles verification
- `generateOtp()` - Clerk handles email verification
- `verifyOtp()` - Clerk handles verification
- `registerUser()` - Clerk handles registration
- `loginWithPassword()` - Clerk handles password login
- `loginWithOtp()` - Clerk handles email verification
- `changePassword()` - Clerk handles password changes

**New Functions:**
- `upsertUserFromClerk()` - Sync user from Clerk auth event
- `getUserByClerkId()` - Lookup user by Clerk ID
- `getUserById()` - Lookup user by application ID

**Updated Functions:**
- `refreshTokens()` - Now includes `clerkId` in JWT payload
- `issueTokens()` - Updated to include `clerkId`

#### Notification Service (`notification.service.ts`)
**Removed Functions:**
- `sendPushNotification()` - Firebase push notifications
- `sendPushToMultiple()` - Firebase multicast
- `sendSms()` - Twilio SMS
- `sendOtpSms()` - OTP delivery
- `getTwilioClient()` - Twilio client initialization

**New Functions:**
- `sendEmail()` - Generic email sending via Resend
- `sendVerificationEmail()` - Email verification workflow
- `sendRideNotificationEmail()` - Ride request notifications
- `sendOfferNotificationEmail()` - Driver offer notifications
- `sendRideStatusEmail()` - Status update emails
- `sendEmailToUser()` - Send email to user by ID

**Maintained Functions (Updated to use Email):**
- `notifyDriverNewRide()`
- `notifyPassengerOfferReceived()`
- `notifyDriverOfferAccepted()`
- `notifyRideStatusChange()`

### 5. Middleware Updates

**File:** `middleware/authenticate.ts`

**Changes:**
- Added support for Clerk token verification
- Fallback to JWT verification for backward compatibility
- Updated `AuthUser` interface to include `email` and `clerkId`
- Removed `phone` field (email is primary identifier)

**New Async Flow:**
1. Attempt Clerk token verification
2. If successful, fetch user from database using Clerk ID
3. Fallback to JWT verification if Clerk fails
4. Populate `req.user` with complete user context

### 6. Frontend Setup

**File:** `apps/web/src/app/layout.tsx`

**Changes:**
- Added `ClerkProvider` wrapper around application
- Clerk Provider initialization with environment variables
- Maintained existing React Query and Socket.IO providers

### 7. Environment Files

**Files Updated:**
- `apps/api/.env.example` - Backend environment template
- `apps/web/.env.example` - Frontend environment template

## Required Actions

### 1. Configure Neon Database
```bash
1. Create project at neon.tech
2. Get DATABASE_URL (pooled connection recommended)
3. Run migration: npm run migrate
```

### 2. Configure Clerk
```bash
1. Create app at clerk.com
2. Get CLERK_SECRET_KEY
3. Configure allowed domains: rideme.ink, www.rideme.ink
```

### 3. Configure Resend
```bash
1. Create account at resend.com
2. Get RESEND_API_KEY
3. Add domain: rideme.ink
4. Configure SPF, DKIM, DMARC records in DNS
```

### 4. Configure Stripe (Already Setup)
```bash
Existing configuration remains:
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_MONTHLY_PRICE_ID
```

### 5. Deploy to Vercel
```bash
1. Add all environment variables to Vercel project
2. Deploy frontend and backend
3. Test Clerk sign-in/sign-up flow
4. Verify email notifications
```

## Migration Path

### Phase 1: Setup External Services
- [ ] Neon PostgreSQL
- [ ] Clerk
- [ ] Resend

### Phase 2: Database
- [ ] Run migration 002_clerk_migration.sql
- [ ] Backup existing user data

### Phase 3: Deployment
- [ ] Deploy backend with new code
- [ ] Deploy frontend with new code
- [ ] Configure DNS for email domain (Resend)

### Phase 4: Testing
- [ ] Test Clerk sign-up
- [ ] Test Clerk sign-in
- [ ] Test email verification
- [ ] Test password reset
- [ ] Test ride notifications
- [ ] Test Stripe integration

## Rollback Plan

If issues occur:
1. Keep Firebase config for rollback period
2. Maintain JWT token verification as fallback
3. Database changes are additive (no data loss)
4. Can disable Clerk and fall back to JWT

## Notes

- Firebase Admin SDK removed from dependencies (requires pnpm install completion)
- Twilio SDK removed from dependencies
- Socket.IO still used for real-time ride updates
- Redis still used for caching and sessions
- All existing API endpoints remain functional
- Database relationships maintained for backward compatibility

## API Endpoints to Update

### Auth Routes (if using custom endpoints)
- `/auth/register` → Use Clerk
- `/auth/login` → Use Clerk
- `/auth/otp/send` → Removed (Clerk handles)
- `/auth/verify-otp` → Removed (Clerk handles)
- `/auth/refresh` → Keep (JWT refresh)

### Notification Routes
- Email notifications now sent via Resend
- Remove FCM token requirement from frontend
- Update email preferences in user profile

## Testing Checklist

- [ ] Clerk authentication flow works
- [ ] JWT tokens generated and validated
- [ ] Email verification emails sent
- [ ] Ride notifications sent via email
- [ ] Stripe webhooks process correctly
- [ ] Google Maps integration works
- [ ] AWS S3 file uploads work
- [ ] Redis cache working
- [ ] All existing rides/offers work
