-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- USERS
-- ============================================================
CREATE TYPE user_role AS ENUM ('passenger', 'driver', 'admin');

CREATE TABLE users (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                VARCHAR(255) UNIQUE NOT NULL,
  phone                VARCHAR(20) UNIQUE NOT NULL,
  phone_verified       BOOLEAN NOT NULL DEFAULT false,
  password_hash        VARCHAR(255) NOT NULL,
  first_name           VARCHAR(100) NOT NULL,
  last_name            VARCHAR(100) NOT NULL,
  avatar_url           TEXT,
  role                 user_role NOT NULL DEFAULT 'passenger',
  is_active            BOOLEAN NOT NULL DEFAULT true,
  is_blocked           BOOLEAN NOT NULL DEFAULT false,
  fcm_token            TEXT,
  stripe_customer_id   VARCHAR(100),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at         TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- OTP CODES
-- ============================================================
CREATE TABLE otp_codes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone       VARCHAR(20) NOT NULL,
  code        VARCHAR(6) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  is_used     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_phone ON otp_codes(phone);

-- ============================================================
-- DRIVERS
-- ============================================================
CREATE TYPE driver_approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'past_due', 'canceled', 'trialing');

CREATE TABLE drivers (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  license_number              VARCHAR(50) NOT NULL,
  license_expiry_date         DATE NOT NULL,
  rating_average              DECIMAL(3,2) NOT NULL DEFAULT 5.00,
  rating_count                INTEGER NOT NULL DEFAULT 0,
  total_trips                 INTEGER NOT NULL DEFAULT 0,
  total_earnings              DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_online                   BOOLEAN NOT NULL DEFAULT false,
  is_approved                 BOOLEAN NOT NULL DEFAULT false,
  approval_status             driver_approval_status NOT NULL DEFAULT 'pending',
  approval_notes              TEXT,
  current_latitude            DECIMAL(10,7),
  current_longitude           DECIMAL(10,7),
  current_location_updated_at TIMESTAMPTZ,
  location_geom               GEOGRAPHY(POINT, 4326),
  stripe_customer_id          VARCHAR(100),
  stripe_subscription_id      VARCHAR(100),
  subscription_status         subscription_status NOT NULL DEFAULT 'inactive',
  subscription_period_end     TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_drivers_is_online ON drivers(is_online);
CREATE INDEX idx_drivers_location ON drivers USING GIST(location_geom);
CREATE INDEX idx_drivers_subscription ON drivers(subscription_status);

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE TYPE vehicle_type AS ENUM ('sedan', 'suv', 'van', 'motorcycle');

CREATE TABLE vehicles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id     UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  make          VARCHAR(100) NOT NULL,
  model         VARCHAR(100) NOT NULL,
  year          INTEGER NOT NULL,
  color         VARCHAR(50) NOT NULL,
  plate_number  VARCHAR(20) NOT NULL UNIQUE,
  vehicle_type  vehicle_type NOT NULL DEFAULT 'sedan',
  capacity      INTEGER NOT NULL DEFAULT 4,
  photo_url     TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_driver ON vehicles(driver_id);

-- ============================================================
-- DRIVER DOCUMENTS
-- ============================================================
CREATE TYPE document_type AS ENUM (
  'id_front', 'id_back',
  'license_front', 'license_back',
  'vehicle_registration', 'insurance', 'photo_selfie'
);
CREATE TYPE document_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE driver_documents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id         UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  document_type     document_type NOT NULL,
  file_url          TEXT NOT NULL,
  file_key          TEXT NOT NULL,
  status            document_status NOT NULL DEFAULT 'pending',
  rejection_reason  TEXT,
  reviewed_by       UUID REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_driver ON driver_documents(driver_id);

-- ============================================================
-- FARE CONFIGS
-- ============================================================
CREATE TABLE fare_configs (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city                    VARCHAR(100) NOT NULL,
  currency                VARCHAR(3) NOT NULL DEFAULT 'USD',
  min_fare                DECIMAL(10,2) NOT NULL,
  per_km_rate             DECIMAL(10,4) NOT NULL,
  per_minute_rate         DECIMAL(10,4) NOT NULL,
  base_fare               DECIMAL(10,2) NOT NULL,
  surge_multiplier        DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  trip_fee_amount         DECIMAL(10,2) NOT NULL,
  subscription_price_id   VARCHAR(100),
  subscription_amount     DECIMAL(10,2) NOT NULL,
  search_radius_meters    INTEGER NOT NULL DEFAULT 5000,
  offer_window_seconds    INTEGER NOT NULL DEFAULT 300,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RIDES
-- ============================================================
CREATE TYPE ride_status AS ENUM (
  'scheduled', 'searching', 'negotiating', 'accepted',
  'driver_en_route', 'arrived', 'in_progress',
  'completed', 'canceled', 'expired'
);
CREATE TYPE payment_method_type AS ENUM ('cash', 'card');
CREATE TYPE payment_status_type AS ENUM ('pending', 'charged', 'failed', 'refunded');
CREATE TYPE ride_type AS ENUM ('standard', 'premium');

CREATE TABLE rides (
  id                           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id                 UUID NOT NULL REFERENCES users(id),
  driver_id                    UUID REFERENCES drivers(id),
  origin_address               TEXT NOT NULL,
  origin_latitude              DECIMAL(10,7) NOT NULL,
  origin_longitude             DECIMAL(10,7) NOT NULL,
  origin_geom                  GEOGRAPHY(POINT, 4326),
  destination_address          TEXT NOT NULL,
  destination_latitude         DECIMAL(10,7) NOT NULL,
  destination_longitude        DECIMAL(10,7) NOT NULL,
  distance_meters              INTEGER,
  duration_seconds             INTEGER,
  proposed_price               DECIMAL(10,2) NOT NULL,
  final_price                  DECIMAL(10,2),
  currency                     VARCHAR(3) NOT NULL DEFAULT 'USD',
  status                       ride_status NOT NULL DEFAULT 'searching',
  payment_method               payment_method_type,
  payment_status               payment_status_type NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id     VARCHAR(100),
  is_scheduled                 BOOLEAN NOT NULL DEFAULT false,
  scheduled_for                TIMESTAMPTZ,
  scheduled_notification_sent  BOOLEAN NOT NULL DEFAULT false,
  ride_type                    ride_type NOT NULL DEFAULT 'standard',
  cancel_reason                TEXT,
  canceled_by                  VARCHAR(20),
  offer_expiry_at              TIMESTAMPTZ,
  polyline                     TEXT,
  started_at                   TIMESTAMPTZ,
  arrived_at                   TIMESTAMPTZ,
  completed_at                 TIMESTAMPTZ,
  canceled_at                  TIMESTAMPTZ,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rides_passenger ON rides(passenger_id);
CREATE INDEX idx_rides_driver ON rides(driver_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_scheduled ON rides(is_scheduled, scheduled_for) WHERE is_scheduled = true;
CREATE INDEX idx_rides_origin ON rides USING GIST(origin_geom);

-- ============================================================
-- RIDE OFFERS
-- ============================================================
CREATE TYPE offer_type AS ENUM ('accept', 'counter');
CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected', 'expired', 'withdrawn');

CREATE TABLE ride_offers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id           UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  driver_id         UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  offered_price     DECIMAL(10,2) NOT NULL,
  offer_type        offer_type NOT NULL,
  status            offer_status NOT NULL DEFAULT 'pending',
  message           TEXT,
  driver_eta_seconds INTEGER,
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ride_id, driver_id)
);

CREATE INDEX idx_offers_ride ON ride_offers(ride_id);
CREATE INDEX idx_offers_driver ON ride_offers(driver_id, status);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE subscriptions (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id                 UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  stripe_subscription_id    VARCHAR(100) UNIQUE NOT NULL,
  stripe_customer_id        VARCHAR(100) NOT NULL,
  stripe_price_id           VARCHAR(100) NOT NULL,
  status                    VARCHAR(30) NOT NULL,
  current_period_start      TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,
  cancel_at_period_end      BOOLEAN NOT NULL DEFAULT false,
  canceled_at               TIMESTAMPTZ,
  trial_end                 TIMESTAMPTZ,
  monthly_amount            DECIMAL(10,2) NOT NULL,
  currency                  VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_driver ON subscriptions(driver_id);

-- ============================================================
-- PAYMENT METHODS
-- ============================================================
CREATE TABLE payment_methods (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_method_id  VARCHAR(100) UNIQUE NOT NULL,
  card_brand                VARCHAR(30),
  card_last4                VARCHAR(4),
  card_exp_month            INTEGER,
  card_exp_year             INTEGER,
  is_default                BOOLEAN NOT NULL DEFAULT false,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TYPE payment_record_type AS ENUM ('ride_passenger', 'trip_fee_driver', 'subscription');
CREATE TYPE payment_record_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

CREATE TABLE payments (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id                   UUID REFERENCES rides(id),
  user_id                   UUID NOT NULL REFERENCES users(id),
  driver_id                 UUID REFERENCES drivers(id),
  payment_type              payment_record_type NOT NULL,
  amount                    DECIMAL(10,2) NOT NULL,
  currency                  VARCHAR(3) NOT NULL DEFAULT 'USD',
  payment_method            VARCHAR(20) NOT NULL,
  status                    payment_record_status NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id  VARCHAR(100),
  stripe_charge_id          VARCHAR(100),
  stripe_refund_id          VARCHAR(100),
  failure_reason            TEXT,
  metadata                  JSONB,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_driver ON payments(driver_id);
CREATE INDEX idx_payments_ride ON payments(ride_id);

-- ============================================================
-- RATINGS
-- ============================================================
CREATE TABLE ratings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id       UUID NOT NULL REFERENCES rides(id) UNIQUE,
  rated_by      UUID NOT NULL REFERENCES users(id),
  rated_user_id UUID NOT NULL REFERENCES users(id),
  stars         INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment       TEXT,
  tags          TEXT[],
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ratings_rated_user ON ratings(rated_user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR(50) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  body            TEXT NOT NULL,
  data            JSONB,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  sent_via_fcm    BOOLEAN NOT NULL DEFAULT false,
  fcm_message_id  VARCHAR(200),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================================
-- CALLS
-- ============================================================
CREATE TYPE call_status AS ENUM ('initiated', 'ringing', 'active', 'ended', 'missed');

CREATE TABLE calls (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id          UUID NOT NULL REFERENCES rides(id),
  caller_id        UUID NOT NULL REFERENCES users(id),
  callee_id        UUID NOT NULL REFERENCES users(id),
  status           call_status NOT NULL DEFAULT 'initiated',
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  duration_seconds INTEGER,
  webrtc_room_id   VARCHAR(100),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rides_updated_at BEFORE UPDATE ON rides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON ride_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED: default fare config
-- ============================================================
INSERT INTO fare_configs (
  city, currency, min_fare, per_km_rate, per_minute_rate, base_fare,
  trip_fee_amount, subscription_amount, search_radius_meters, offer_window_seconds
) VALUES (
  'default', 'USD', 3.00, 0.80, 0.15, 1.50,
  1.50, 29.99, 5000, 300
);
