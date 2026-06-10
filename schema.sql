CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('passenger','user','driver','admin','owner');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id text,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'passenger',
  is_active boolean NOT NULL DEFAULT true,
  is_blocked boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE drivers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  license_number text,
  license_expiry_date date,
  approval_status text NOT NULL DEFAULT 'approved',
  is_approved boolean NOT NULL DEFAULT true,
  is_online boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  rating_average numeric NOT NULL DEFAULT 5.0,
  rating_count int NOT NULL DEFAULT 0,
  subscription_status text NOT NULL DEFAULT 'active',
  total_earnings numeric NOT NULL DEFAULT 0,
  total_trips int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id uuid REFERENCES drivers(id),
  make text, model text, plate_number text, color text, year int,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rides (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id uuid REFERENCES users(id),
  driver_id uuid REFERENCES drivers(id),
  status text NOT NULL,
  ride_type text NOT NULL DEFAULT 'standard',
  origin_address text, destination_address text,
  proposed_price numeric, final_price numeric, currency text DEFAULT 'MXN',
  distance_meters int, duration_seconds int, message text,
  payment_method text DEFAULT 'card', payment_status text DEFAULT 'paid',
  cancel_reason text, canceled_at timestamptz, completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  email text, role user_role NOT NULL DEFAULT 'driver',
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid, accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
