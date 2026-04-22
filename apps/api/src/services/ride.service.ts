import { query, withTransaction } from '../config/database';
import { findNearbyDrivers, encodeGeohash, getZoneGeohashes } from './location.service';
import { env } from '../config/env';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface Ride {
  id: string;
  passengerId: string;
  driverId: string | null;
  status: RideStatus;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  passengerPrice: number;
  finalPrice: number | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  vehicleType: string;
  scheduledAt: Date | null;
  startedAt: Date | null;
  arrivedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  paymentIntentId: string | null;
  paymentStatus: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type RideStatus =
  | 'searching'
  | 'negotiating'
  | 'accepted'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface CreateRideInput {
  passengerId: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  passengerPrice: number;
  vehicleType?: string;
  scheduledAt?: Date;
  notes?: string;
}

export async function createRide(input: CreateRideInput): Promise<Ride> {
  const { rows } = await query<Ride>(
    `INSERT INTO rides (
       passenger_id, pickup_address, pickup_lat, pickup_lng, pickup_location,
       dropoff_address, dropoff_lat, dropoff_lng, dropoff_location,
       passenger_price, vehicle_type, scheduled_at, notes,
       status
     ) VALUES (
       $1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326),
       $7, $8, $9, ST_SetSRID(ST_MakePoint($10, $11), 4326),
       $12, $13, $14, $15,
       $16
     ) RETURNING
       id, passenger_id as "passengerId", driver_id as "driverId",
       status, pickup_address as "pickupAddress",
       pickup_lat as "pickupLat", pickup_lng as "pickupLng",
       dropoff_address as "dropoffAddress",
       dropoff_lat as "dropoffLat", dropoff_lng as "dropoffLng",
       passenger_price as "passengerPrice", final_price as "finalPrice",
       distance_meters as "distanceMeters", duration_seconds as "durationSeconds",
       vehicle_type as "vehicleType", scheduled_at as "scheduledAt",
       started_at as "startedAt", arrived_at as "arrivedAt",
       completed_at as "completedAt", cancelled_at as "cancelledAt",
       cancel_reason as "cancelReason", payment_intent_id as "paymentIntentId",
       payment_status as "paymentStatus", notes,
       created_at as "createdAt", updated_at as "updatedAt"`,
    [
      input.passengerId,
      input.pickupAddress,
      input.pickupLat,
      input.pickupLng,
      input.pickupLng, // ST_MakePoint(lng, lat)
      input.pickupLat,
      input.dropoffAddress,
      input.dropoffLat,
      input.dropoffLng,
      input.dropoffLng, // ST_MakePoint(lng, lat)
      input.dropoffLat,
      input.passengerPrice,
      input.vehicleType ?? 'standard',
      input.scheduledAt ?? null,
      input.notes ?? null,
      input.scheduledAt ? 'scheduled' : 'searching',
    ]
  );

  const ride = rows[0];
  logger.info('Ride created', { rideId: ride.id, passengerId: input.passengerId });
  return ride;
}

export async function getRideById(rideId: string): Promise<Ride> {
  const { rows } = await query<Ride>(
    `SELECT
       id, passenger_id as "passengerId", driver_id as "driverId",
       status, pickup_address as "pickupAddress",
       pickup_lat as "pickupLat", pickup_lng as "pickupLng",
       dropoff_address as "dropoffAddress",
       dropoff_lat as "dropoffLat", dropoff_lng as "dropoffLng",
       passenger_price as "passengerPrice", final_price as "finalPrice",
       distance_meters as "distanceMeters", duration_seconds as "durationSeconds",
       vehicle_type as "vehicleType", scheduled_at as "scheduledAt",
       started_at as "startedAt", arrived_at as "arrivedAt",
       completed_at as "completedAt", cancelled_at as "cancelledAt",
       cancel_reason as "cancelReason", payment_intent_id as "paymentIntentId",
       payment_status as "paymentStatus", notes,
       created_at as "createdAt", updated_at as "updatedAt"
     FROM rides WHERE id = $1`,
    [rideId]
  );

  if (rows.length === 0) throw new NotFoundError('Ride not found');
  return rows[0];
}

export async function getPassengerRides(
  passengerId: string,
  limit = 20,
  offset = 0
): Promise<{ rides: Ride[]; total: number }> {
  const { rows: countRows } = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM rides WHERE passenger_id = $1`,
    [passengerId]
  );

  const { rows } = await query<Ride>(
    `SELECT
       id, passenger_id as "passengerId", driver_id as "driverId",
       status, pickup_address as "pickupAddress",
       pickup_lat as "pickupLat", pickup_lng as "pickupLng",
       dropoff_address as "dropoffAddress",
       dropoff_lat as "dropoffLat", dropoff_lng as "dropoffLng",
       passenger_price as "passengerPrice", final_price as "finalPrice",
       distance_meters as "distanceMeters", duration_seconds as "durationSeconds",
       vehicle_type as "vehicleType", scheduled_at as "scheduledAt",
       started_at as "startedAt", arrived_at as "arrivedAt",
       completed_at as "completedAt", cancelled_at as "cancelledAt",
       cancel_reason as "cancelReason", payment_status as "paymentStatus",
       notes, created_at as "createdAt", updated_at as "updatedAt"
     FROM rides
     WHERE passenger_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [passengerId, limit, offset]
  );

  return { rides: rows, total: parseInt(countRows[0].count) };
}

export async function getDriverRides(
  driverId: string,
  limit = 20,
  offset = 0
): Promise<{ rides: Ride[]; total: number }> {
  const { rows: countRows } = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM rides WHERE driver_id = $1`,
    [driverId]
  );

  const { rows } = await query<Ride>(
    `SELECT
       id, passenger_id as "passengerId", driver_id as "driverId",
       status, pickup_address as "pickupAddress",
       pickup_lat as "pickupLat", pickup_lng as "pickupLng",
       dropoff_address as "dropoffAddress",
       dropoff_lat as "dropoffLat", dropoff_lng as "dropoffLng",
       passenger_price as "passengerPrice", final_price as "finalPrice",
       distance_meters as "distanceMeters", duration_seconds as "durationSeconds",
       vehicle_type as "vehicleType", scheduled_at as "scheduledAt",
       started_at as "startedAt", arrived_at as "arrivedAt",
       completed_at as "completedAt", cancelled_at as "cancelledAt",
       cancel_reason as "cancelReason", payment_status as "paymentStatus",
       notes, created_at as "createdAt", updated_at as "updatedAt"
     FROM rides
     WHERE driver_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [driverId, limit, offset]
  );

  return { rides: rows, total: parseInt(countRows[0].count) };
}

export async function cancelRide(
  rideId: string,
  requesterId: string,
  requesterRole: string,
  reason?: string
): Promise<Ride> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<Ride & { passenger_id: string; driver_id: string | null }>(
      `SELECT id, status, passenger_id, driver_id FROM rides WHERE id = $1 FOR UPDATE`,
      [rideId]
    );

    if (rows.length === 0) throw new NotFoundError('Ride not found');
    const ride = rows[0];

    // Authorization check
    const isPassenger = (ride as unknown as Record<string, string>).passenger_id === requesterId;
    const isDriver = (ride as unknown as Record<string, string | null>).driver_id === requesterId;
    if (!isPassenger && !isDriver && requesterRole !== 'admin') {
      throw new ForbiddenError('Not authorized to cancel this ride');
    }

    const cancellableStatuses: RideStatus[] = ['searching', 'negotiating', 'accepted', 'driver_arrived'];
    if (!cancellableStatuses.includes(ride.status as RideStatus)) {
      throw new BadRequestError(`Cannot cancel a ride with status: ${ride.status}`);
    }

    const { rows: updated } = await client.query<Ride>(
      `UPDATE rides
       SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING
         id, passenger_id as "passengerId", driver_id as "driverId",
         status, pickup_address as "pickupAddress",
         pickup_lat as "pickupLat", pickup_lng as "pickupLng",
         dropoff_address as "dropoffAddress",
         dropoff_lat as "dropoffLat", dropoff_lng as "dropoffLng",
         passenger_price as "passengerPrice", final_price as "finalPrice",
         vehicle_type as "vehicleType", scheduled_at as "scheduledAt",
         started_at as "startedAt", cancelled_at as "cancelledAt",
         cancel_reason as "cancelReason",
         created_at as "createdAt", updated_at as "updatedAt"`,
      [reason ?? null, rideId]
    );

    // Cancel pending offers
    await client.query(
      `UPDATE offers SET status = 'rejected', updated_at = NOW()
       WHERE ride_id = $1 AND status = 'pending'`,
      [rideId]
    );

    logger.info('Ride cancelled', { rideId, requesterId, reason });
    return updated[0];
  });
}

export async function startRide(rideId: string, driverId: string): Promise<Ride> {
  const { rows } = await query<Ride>(
    `UPDATE rides
     SET status = 'in_progress', started_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND driver_id = $2 AND status = 'driver_arrived'
     RETURNING
       id, passenger_id as "passengerId", driver_id as "driverId",
       status, pickup_address as "pickupAddress",
       dropoff_address as "dropoffAddress",
       passenger_price as "passengerPrice", final_price as "finalPrice",
       started_at as "startedAt", created_at as "createdAt", updated_at as "updatedAt"`,
    [rideId, driverId]
  );

  if (rows.length === 0) {
    throw new BadRequestError('Cannot start ride: not found or invalid status/driver');
  }

  logger.info('Ride started', { rideId, driverId });
  return rows[0];
}

export async function markDriverArrived(rideId: string, driverId: string): Promise<Ride> {
  const { rows } = await query<Ride>(
    `UPDATE rides
     SET status = 'driver_arrived', arrived_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND driver_id = $2 AND status = 'accepted'
     RETURNING
       id, passenger_id as "passengerId", driver_id as "driverId",
       status, pickup_address as "pickupAddress",
       dropoff_address as "dropoffAddress",
       arrived_at as "arrivedAt", created_at as "createdAt", updated_at as "updatedAt"`,
    [rideId, driverId]
  );

  if (rows.length === 0) {
    throw new BadRequestError('Cannot mark arrived: not found or invalid status/driver');
  }

  logger.info('Driver arrived', { rideId, driverId });
  return rows[0];
}

export async function completeRide(
  rideId: string,
  driverId: string,
  distanceMeters?: number,
  durationSeconds?: number
): Promise<Ride> {
  const { rows } = await query<Ride>(
    `UPDATE rides
     SET status = 'completed',
         completed_at = NOW(),
         distance_meters = COALESCE($3, distance_meters),
         duration_seconds = COALESCE($4, duration_seconds),
         updated_at = NOW()
     WHERE id = $1 AND driver_id = $2 AND status = 'in_progress'
     RETURNING
       id, passenger_id as "passengerId", driver_id as "driverId",
       status, pickup_address as "pickupAddress",
       dropoff_address as "dropoffAddress",
       passenger_price as "passengerPrice", final_price as "finalPrice",
       distance_meters as "distanceMeters", duration_seconds as "durationSeconds",
       started_at as "startedAt", completed_at as "completedAt",
       created_at as "createdAt", updated_at as "updatedAt"`,
    [rideId, driverId, distanceMeters ?? null, durationSeconds ?? null]
  );

  if (rows.length === 0) {
    throw new BadRequestError('Cannot complete ride: not found or invalid status/driver');
  }

  // Increment driver total rides
  await query(
    `UPDATE drivers SET total_rides = total_rides + 1, updated_at = NOW() WHERE id = $1`,
    [driverId]
  );

  logger.info('Ride completed', { rideId, driverId });
  return rows[0];
}

export async function getScheduledRidesDue(leadTimeMinutes: number): Promise<Ride[]> {
  const { rows } = await query<Ride>(
    `SELECT
       id, passenger_id as "passengerId",
       pickup_lat as "pickupLat", pickup_lng as "pickupLng",
       pickup_address as "pickupAddress", dropoff_address as "dropoffAddress",
       passenger_price as "passengerPrice", vehicle_type as "vehicleType",
       scheduled_at as "scheduledAt"
     FROM rides
     WHERE status = 'scheduled'
       AND scheduled_at BETWEEN NOW() AND NOW() + ($1 || ' minutes')::interval
     ORDER BY scheduled_at ASC`,
    [leadTimeMinutes.toString()]
  );
  return rows;
}

export async function activateScheduledRide(rideId: string): Promise<void> {
  await query(
    `UPDATE rides SET status = 'searching', updated_at = NOW() WHERE id = $1 AND status = 'scheduled'`,
    [rideId]
  );
}

export interface NearbyDriverForRide {
  driverId: string;
  userId: string;
  name: string;
  fcmToken: string | null;
  lat: number;
  lng: number;
  geohash: string;
  distanceMeters: number;
}

export async function findAndNotifyNearbyDrivers(
  rideId: string,
  lat: number,
  lng: number,
  vehicleType?: string
): Promise<NearbyDriverForRide[]> {
  const nearbyDrivers = await findNearbyDrivers(
    lat,
    lng,
    env.NEARBY_DRIVER_RADIUS_METERS,
    vehicleType
  );

  logger.info('Nearby drivers found', { rideId, count: nearbyDrivers.length });
  return nearbyDrivers.map((d) => ({
    driverId: d.driverId,
    userId: d.userId,
    name: d.name,
    fcmToken: d.fcmToken,
    lat: d.lat,
    lng: d.lng,
    geohash: d.geohash,
    distanceMeters: d.distanceMeters,
  }));
}

export async function getDriverEarnings(
  driverId: string,
  period: 'today' | 'week' | 'month' | 'all'
): Promise<{
  grossAmount: number;
  tripFees: number;
  netAmount: number;
  rideCount: number;
}> {
  const intervalMap: Record<string, string> = {
    today: "created_at >= CURRENT_DATE",
    week: "created_at >= date_trunc('week', CURRENT_DATE)",
    month: "created_at >= date_trunc('month', CURRENT_DATE)",
    all: '1=1',
  };

  const condition = intervalMap[period] || '1=1';

  const { rows } = await query<{
    gross_amount: number;
    trip_fee: number;
    net_amount: number;
    ride_count: number;
  }>(
    `SELECT
       COALESCE(SUM(gross_amount), 0) as gross_amount,
       COALESCE(SUM(trip_fee), 0) as trip_fee,
       COALESCE(SUM(net_amount), 0) as net_amount,
       COUNT(*) as ride_count
     FROM driver_earnings
     WHERE driver_id = $1 AND ${condition}`,
    [driverId]
  );

  const row = rows[0];
  return {
    grossAmount: parseFloat(row.gross_amount.toString()),
    tripFees: parseFloat(row.trip_fee.toString()),
    netAmount: parseFloat(row.net_amount.toString()),
    rideCount: parseInt(row.ride_count.toString()),
  };
}
