import ngeohash from 'ngeohash';
import { query } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

export interface DriverLocation {
  driverId: string;
  lat: number;
  lng: number;
  geohash: string;
  updatedAt: Date;
}

export interface NearbyDriver {
  driverId: string;
  userId: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  geohash: string;
  vehicleType: string;
  rating: number;
  name: string;
  fcmToken: string | null;
}

export function encodeGeohash(lat: number, lng: number, precision = 7): string {
  return ngeohash.encode(lat, lng, precision);
}

export function getNeighborGeohashes(geohash: string): string[] {
  const neighbors = ngeohash.neighbors(geohash);
  return [geohash, ...Object.values(neighbors)];
}

export async function updateDriverLocation(
  driverId: string,
  lat: number,
  lng: number
): Promise<void> {
  const geohash = encodeGeohash(lat, lng);

  await query(
    `UPDATE drivers
     SET location = ST_SetSRID(ST_MakePoint($2, $1), 4326),
         geohash = $3,
         last_location_at = NOW(),
         updated_at = NOW()
     WHERE id = $4`,
    [lat, lng, geohash, driverId]
  );

  // Store in Redis for fast reads
  await redis.geoadd('drivers:geo', lng, lat, driverId);
  await redis.hset(`driver:loc:${driverId}`, {
    lat: lat.toString(),
    lng: lng.toString(),
    geohash,
    updatedAt: new Date().toISOString(),
  });
  await redis.expire(`driver:loc:${driverId}`, 300); // 5 min TTL
}

export async function getDriverLocation(driverId: string): Promise<DriverLocation | null> {
  const data = await redis.hgetall(`driver:loc:${driverId}`);
  if (data && data.lat) {
    return {
      driverId,
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lng),
      geohash: data.geohash,
      updatedAt: new Date(data.updatedAt),
    };
  }

  // Fallback to DB
  const { rows } = await query<{
    lat: number;
    lng: number;
    geohash: string;
    last_location_at: Date;
  }>(
    `SELECT
       ST_Y(location::geometry) as lat,
       ST_X(location::geometry) as lng,
       geohash,
       last_location_at
     FROM drivers WHERE id = $1 AND location IS NOT NULL`,
    [driverId]
  );

  if (rows.length === 0) return null;

  return {
    driverId,
    lat: rows[0].lat,
    lng: rows[0].lng,
    geohash: rows[0].geohash,
    updatedAt: rows[0].last_location_at,
  };
}

export async function findNearbyDrivers(
  lat: number,
  lng: number,
  radiusMeters: number,
  vehicleType?: string
): Promise<NearbyDriver[]> {
  const vehicleFilter = vehicleType ? `AND d.vehicle_type = '${vehicleType}'` : '';

  const { rows } = await query<NearbyDriver & { distance_meters: number }>(
    `SELECT
       d.id as "driverId",
       d.user_id as "userId",
       ST_Y(d.location::geometry) as lat,
       ST_X(d.location::geometry) as lng,
       ST_Distance(
         d.location::geography,
         ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
       ) as "distanceMeters",
       d.geohash,
       d.vehicle_type as "vehicleType",
       d.rating,
       u.name,
       u.fcm_token as "fcmToken"
     FROM drivers d
     JOIN users u ON u.id = d.user_id
     WHERE
       d.is_online = TRUE
       AND d.is_verified = TRUE
       AND d.subscription_status = 'active'
       AND d.location IS NOT NULL
       AND ST_DWithin(
         d.location::geography,
         ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
         $3
       )
       ${vehicleFilter}
     ORDER BY "distanceMeters" ASC
     LIMIT 20`,
    [lat, lng, radiusMeters]
  );

  return rows;
}

export async function getZoneGeohashes(lat: number, lng: number): Promise<string[]> {
  const geohash = encodeGeohash(lat, lng, 5); // 5-char geohash ~5km cell
  return getNeighborGeohashes(geohash);
}

export async function setDriverOnline(driverId: string): Promise<void> {
  await redis.sadd('drivers:online', driverId);
  logger.debug('Driver set online in Redis', { driverId });
}

export async function setDriverOffline(driverId: string): Promise<void> {
  await redis.srem('drivers:online', driverId);
  await redis.del(`driver:loc:${driverId}`);
  // Remove from geo index
  await redis.zrem('drivers:geo', driverId);
  logger.debug('Driver set offline in Redis', { driverId });
}

export async function isDriverOnline(driverId: string): Promise<boolean> {
  const result = await redis.sismember('drivers:online', driverId);
  return result === 1;
}
