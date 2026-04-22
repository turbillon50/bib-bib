import { query, withTransaction } from '../config/database';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface Offer {
  id: string;
  rideId: string;
  driverId: string;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'withdrawn';
  message: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  driverName?: string;
  driverRating?: number;
  driverVehicleMake?: string;
  driverVehicleModel?: string;
  driverVehicleColor?: string;
  driverVehiclePlate?: string;
  driverAvatar?: string;
}

export async function createOffer(
  driverId: string,
  rideId: string,
  amount: number,
  message?: string
): Promise<Offer> {
  return withTransaction(async (client) => {
    // Validate ride exists and is accepting offers
    const { rows: rideRows } = await client.query<{ status: string; passenger_id: string }>(
      `SELECT status, passenger_id FROM rides WHERE id = $1 FOR UPDATE`,
      [rideId]
    );

    if (rideRows.length === 0) throw new NotFoundError('Ride not found');
    if (!['searching', 'negotiating'].includes(rideRows[0].status)) {
      throw new BadRequestError(`Ride is not accepting offers (status: ${rideRows[0].status})`);
    }

    // Check if driver already has a pending/accepted offer for this ride
    const { rows: existingOffer } = await client.query<{ id: string; status: string }>(
      `SELECT id, status FROM offers WHERE ride_id = $1 AND driver_id = $2`,
      [rideId, driverId]
    );

    if (existingOffer.length > 0) {
      if (existingOffer[0].status === 'pending') {
        throw new ConflictError('You already have a pending offer for this ride');
      }
      // Allow re-offer if previous was rejected/withdrawn
      if (['rejected', 'withdrawn', 'expired'].includes(existingOffer[0].status)) {
        // Update existing offer
        const expiresAt = new Date(Date.now() + env.OFFER_EXPIRY_SECONDS * 1000);
        const { rows } = await client.query<Offer>(
          `UPDATE offers
           SET amount = $1, message = $2, status = 'pending', expires_at = $3, updated_at = NOW()
           WHERE id = $4
           RETURNING *`,
          [amount, message ?? null, expiresAt, existingOffer[0].id]
        );
        return enrichOffer(rows[0], client);
      }
    }

    const expiresAt = new Date(Date.now() + env.OFFER_EXPIRY_SECONDS * 1000);

    const { rows } = await client.query<Offer>(
      `INSERT INTO offers (ride_id, driver_id, amount, message, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [rideId, driverId, amount, message ?? null, expiresAt]
    );

    // Update ride status to negotiating
    await client.query(
      `UPDATE rides SET status = 'negotiating', updated_at = NOW() WHERE id = $1 AND status = 'searching'`,
      [rideId]
    );

    // Cache offer expiry in Redis for background job
    await redis.zadd(
      'offers:expiry',
      expiresAt.getTime(),
      rows[0].id
    );

    logger.info('Offer created', { offerId: rows[0].id, driverId, rideId, amount });
    return enrichOffer(rows[0], client);
  });
}

async function enrichOffer(
  offer: Offer,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any
): Promise<Offer> {
  const { rows } = await client.query<{
    name: string;
    rating: number;
    vehicle_make: string;
    vehicle_model: string;
    vehicle_color: string;
    vehicle_plate: string;
    avatar_url: string | null;
  }>(
    `SELECT u.name, d.rating, d.vehicle_make, d.vehicle_model,
            d.vehicle_color, d.vehicle_plate, d.avatar_url
     FROM drivers d JOIN users u ON u.id = d.user_id
     WHERE d.id = $1`,
    [offer.driverId]
  );

  if (rows.length > 0) {
    const driver = rows[0];
    offer.driverName = driver.name;
    offer.driverRating = driver.rating;
    offer.driverVehicleMake = driver.vehicle_make;
    offer.driverVehicleModel = driver.vehicle_model;
    offer.driverVehicleColor = driver.vehicle_color;
    offer.driverVehiclePlate = driver.vehicle_plate;
    offer.driverAvatar = driver.avatar_url ?? undefined;
  }

  return offer;
}

export async function getOffersForRide(rideId: string): Promise<Offer[]> {
  const { rows } = await query<Offer>(
    `SELECT
       o.*,
       u.name as "driverName",
       d.rating as "driverRating",
       d.vehicle_make as "driverVehicleMake",
       d.vehicle_model as "driverVehicleModel",
       d.vehicle_color as "driverVehicleColor",
       d.vehicle_plate as "driverVehiclePlate",
       d.avatar_url as "driverAvatar"
     FROM offers o
     JOIN drivers d ON d.id = o.driver_id
     JOIN users u ON u.id = d.user_id
     WHERE o.ride_id = $1 AND o.status = 'pending'
     ORDER BY o.created_at DESC`,
    [rideId]
  );
  return rows;
}

export async function acceptOffer(
  offerId: string,
  passengerId: string
): Promise<{ offer: Offer; rideId: string; driverId: string }> {
  return withTransaction(async (client) => {
    // Lock offer row
    const { rows: offerRows } = await client.query<Offer>(
      `SELECT o.*, r.passenger_id, r.status as ride_status
       FROM offers o
       JOIN rides r ON r.id = o.ride_id
       WHERE o.id = $1 FOR UPDATE`,
      [offerId]
    );

    if (offerRows.length === 0) throw new NotFoundError('Offer not found');

    const offer = offerRows[0] as Offer & { passenger_id: string; ride_status: string };

    // Type narrowing: passenger_id comes from the join
    const passengerIdFromJoin = (offer as unknown as Record<string, string>).passenger_id;
    if (passengerIdFromJoin !== passengerId) {
      throw new ForbiddenError('You can only accept offers for your own rides');
    }

    if (offer.status !== 'pending') {
      throw new BadRequestError(`Offer is no longer pending (status: ${offer.status})`);
    }

    if (new Date(offer.expiresAt) < new Date()) {
      throw new BadRequestError('Offer has expired');
    }

    const rideStatus = (offer as unknown as Record<string, string>).ride_status;
    if (!['searching', 'negotiating'].includes(rideStatus)) {
      throw new BadRequestError('Ride is not in a state to accept offers');
    }

    // Accept this offer
    await client.query(
      `UPDATE offers SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
      [offerId]
    );

    // Reject all other pending offers for this ride
    await client.query(
      `UPDATE offers SET status = 'rejected', updated_at = NOW()
       WHERE ride_id = $1 AND id != $2 AND status = 'pending'`,
      [offer.rideId, offerId]
    );

    // Assign driver to ride
    await client.query(
      `UPDATE rides
       SET driver_id = $1, status = 'accepted', final_price = $2, updated_at = NOW()
       WHERE id = $3`,
      [offer.driverId, offer.amount, offer.rideId]
    );

    // Remove from expiry set
    await redis.zrem('offers:expiry', offerId);

    logger.info('Offer accepted', {
      offerId,
      driverId: offer.driverId,
      rideId: offer.rideId,
      amount: offer.amount,
    });

    return { offer, rideId: offer.rideId, driverId: offer.driverId };
  });
}

export async function rejectOffer(offerId: string, passengerId: string): Promise<Offer> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<Offer & { passenger_id: string }>(
      `SELECT o.*, r.passenger_id
       FROM offers o JOIN rides r ON r.id = o.ride_id
       WHERE o.id = $1 FOR UPDATE`,
      [offerId]
    );

    if (rows.length === 0) throw new NotFoundError('Offer not found');

    const offer = rows[0];
    if ((offer as unknown as Record<string, string>).passenger_id !== passengerId) {
      throw new ForbiddenError('You can only reject offers for your own rides');
    }

    if (offer.status !== 'pending') {
      throw new BadRequestError('Offer is not pending');
    }

    const { rows: updated } = await client.query<Offer>(
      `UPDATE offers SET status = 'rejected', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [offerId]
    );

    await redis.zrem('offers:expiry', offerId);

    logger.info('Offer rejected', { offerId });
    return updated[0];
  });
}

export async function withdrawOffer(offerId: string, driverId: string): Promise<Offer> {
  const { rows } = await query<Offer>(
    `UPDATE offers
     SET status = 'withdrawn', updated_at = NOW()
     WHERE id = $1 AND driver_id = $2 AND status = 'pending'
     RETURNING *`,
    [offerId, driverId]
  );

  if (rows.length === 0) {
    throw new NotFoundError('Offer not found or cannot be withdrawn');
  }

  await redis.zrem('offers:expiry', offerId);
  return rows[0];
}

export async function expireOffers(beforeTimestamp: number): Promise<string[]> {
  // Get offers that should be expired
  const expiredIds = await redis.zrangebyscore('offers:expiry', 0, beforeTimestamp);

  if (expiredIds.length === 0) return [];

  // Mark as expired in DB
  const placeholders = expiredIds.map((_, i) => `$${i + 1}`).join(', ');
  await query(
    `UPDATE offers SET status = 'expired', updated_at = NOW()
     WHERE id IN (${placeholders}) AND status = 'pending'`,
    expiredIds
  );

  // Remove from Redis set
  await redis.zremrangebyscore('offers:expiry', 0, beforeTimestamp);

  logger.info('Offers expired', { count: expiredIds.length });
  return expiredIds;
}

export async function getDriverActiveOffer(
  driverId: string,
  rideId: string
): Promise<Offer | null> {
  const { rows } = await query<Offer>(
    `SELECT * FROM offers
     WHERE driver_id = $1 AND ride_id = $2 AND status = 'pending'`,
    [driverId, rideId]
  );
  return rows[0] ?? null;
}
