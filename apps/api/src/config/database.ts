import { Pool, PoolClient } from 'pg';
import { env } from './env';
import { logger } from '../utils/logger';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: env.DB_POOL_IDLE_TIMEOUT,
  connectionTimeoutMillis: env.DB_POOL_CONNECTION_TIMEOUT,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

pool.on('connect', () => {
  logger.debug('New PostgreSQL client connected');
});

export async function connectDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    // Ensure PostGIS extension is available
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis');
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis_topology');
    logger.info('PostgreSQL connected with PostGIS');
  } finally {
    client.release();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = Record<string, any>>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn('Slow query detected', { text, duration });
    }
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  } catch (error) {
    logger.error('Database query error', { text, error });
    throw error;
  }
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function initializeSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE,
        name VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        stripe_customer_id VARCHAR(255),
        fcm_token TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Auth credentials
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_credentials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        password_hash TEXT,
        refresh_token_hash TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // OTP table
    await client.query(`
      CREATE TABLE IF NOT EXISTS otps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(20) NOT NULL,
        code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_otps_phone ON otps(phone)');

    // Drivers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        license_number VARCHAR(100) UNIQUE NOT NULL,
        vehicle_make VARCHAR(100) NOT NULL,
        vehicle_model VARCHAR(100) NOT NULL,
        vehicle_year INTEGER NOT NULL,
        vehicle_plate VARCHAR(50) UNIQUE NOT NULL,
        vehicle_color VARCHAR(50) NOT NULL,
        vehicle_type VARCHAR(50) NOT NULL DEFAULT 'standard',
        avatar_url TEXT,
        is_online BOOLEAN DEFAULT FALSE,
        is_verified BOOLEAN DEFAULT FALSE,
        subscription_status VARCHAR(50) DEFAULT 'inactive',
        stripe_subscription_id VARCHAR(255),
        stripe_customer_id VARCHAR(255),
        rating NUMERIC(3,2) DEFAULT 5.0,
        total_rides INTEGER DEFAULT 0,
        location GEOMETRY(Point, 4326),
        geohash VARCHAR(12),
        last_location_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers USING GIST(location)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_drivers_online ON drivers(is_online) WHERE is_online = TRUE');
    await client.query('CREATE INDEX IF NOT EXISTS idx_drivers_geohash ON drivers(geohash)');

    // Rides table
    await client.query(`
      CREATE TABLE IF NOT EXISTS rides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        passenger_id UUID NOT NULL REFERENCES users(id),
        driver_id UUID REFERENCES drivers(id),
        status VARCHAR(50) NOT NULL DEFAULT 'searching',
        pickup_address TEXT NOT NULL,
        pickup_lat DOUBLE PRECISION NOT NULL,
        pickup_lng DOUBLE PRECISION NOT NULL,
        pickup_location GEOMETRY(Point, 4326),
        dropoff_address TEXT NOT NULL,
        dropoff_lat DOUBLE PRECISION NOT NULL,
        dropoff_lng DOUBLE PRECISION NOT NULL,
        dropoff_location GEOMETRY(Point, 4326),
        passenger_price NUMERIC(10,2) NOT NULL,
        final_price NUMERIC(10,2),
        distance_meters INTEGER,
        duration_seconds INTEGER,
        vehicle_type VARCHAR(50) NOT NULL DEFAULT 'standard',
        scheduled_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ,
        arrived_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        cancel_reason TEXT,
        payment_intent_id VARCHAR(255),
        payment_status VARCHAR(50) DEFAULT 'pending',
        trip_fee_intent_id VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_rides_passenger ON rides(passenger_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_rides_scheduled ON rides(scheduled_at) WHERE scheduled_at IS NOT NULL');

    // Offers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS offers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
        driver_id UUID NOT NULL REFERENCES drivers(id),
        amount NUMERIC(10,2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        message TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(ride_id, driver_id)
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_offers_ride ON offers(ride_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_offers_driver ON offers(driver_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status)');

    // Payment methods table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stripe_payment_method_id VARCHAR(255) NOT NULL UNIQUE,
        brand VARCHAR(50),
        last4 VARCHAR(4),
        exp_month INTEGER,
        exp_year INTEGER,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id)');

    // Driver earnings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS driver_earnings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id UUID NOT NULL REFERENCES drivers(id),
        ride_id UUID NOT NULL REFERENCES rides(id),
        gross_amount NUMERIC(10,2) NOT NULL,
        trip_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
        net_amount NUMERIC(10,2) NOT NULL,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_earnings_driver ON driver_earnings(driver_id)');

    // Notifications log table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        driver_id UUID REFERENCES drivers(id),
        channel VARCHAR(50) NOT NULL,
        type VARCHAR(100) NOT NULL,
        payload JSONB,
        status VARCHAR(50) NOT NULL DEFAULT 'sent',
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');
    logger.info('Database schema initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Schema initialization failed', { error });
    throw error;
  } finally {
    client.release();
  }
}
