import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { getIo } from '../socket/socketServer';
import { getNearbyOnlineDrivers } from '../services/location.service';
import { sendPushToUser } from '../services/notification.service';
import { scheduleOfferExpiry } from '../jobs/queue';
import { success, created } from '../utils/response';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { env } from '../config/env';

const createRideSchema = z.object({
  originAddress: z.string().min(1),
  originLatitude: z.number(),
  originLongitude: z.number(),
  destinationAddress: z.string().min(1),
  destinationLatitude: z.number(),
  destinationLongitude: z.number(),
  proposedPrice: z.number().positive(),
  paymentMethod: z.enum(['cash', 'card']),
  isScheduled: z.boolean().default(false),
  scheduledFor: z.string().optional(),
  rideType: z.enum(['standard', 'premium']).default('standard'),
});

export async function createRide(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createRideSchema.parse(req.body);
    const passengerId = req.user!.id;

    // Ensure no active ride
    const { rows: active } = await query(
      `SELECT id FROM rides WHERE passenger_id = $1 AND status IN
       ('searching','negotiating','accepted','driver_en_route','arrived','in_progress')`,
      [passengerId]
    );
    if (active.length > 0) throw new BadRequestError('You already have an active ride');

    const expiryAt = new Date(Date.now() + env.OFFER_EXPIRY_SECONDS * 1000);
    const status = input.isScheduled ? 'scheduled' : 'searching';

    const { rows: [ride] } = await query(
      `INSERT INTO rides (
         passenger_id, origin_address, origin_latitude, origin_longitude,
         origin_geom, destination_address, destination_latitude, destination_longitude,
         proposed_price, payment_method, is_scheduled, scheduled_for,
         ride_type, status, offer_expiry_at
       ) VALUES ($1,$2,$3,$4,
         ST_SetSRID(ST_MakePoint($4,$3),4326)::geography,
         $5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        passengerId, input.originAddress, input.originLatitude, input.originLongitude,
        input.destinationAddress, input.destinationLatitude, input.destinationLongitude,
        input.proposedPrice, input.paymentMethod, input.isScheduled,
        input.scheduledFor ?? null, input.rideType, status, expiryAt,
      ]
    );

    // For immediate rides: broadcast to nearby drivers
    if (!input.isScheduled) {
      await broadcastRideToDrivers(ride);
      await scheduleOfferExpiry(ride.id, expiryAt);
    }

    res.status(201).json(created({ ride }, 'Ride created'));
  } catch (err) { next(err); }
}

async function broadcastRideToDrivers(ride: Record<string, unknown>) {
  const drivers = await getNearbyOnlineDrivers(
    ride.origin_latitude as number,
    ride.origin_longitude as number,
    env.NEARBY_DRIVER_RADIUS_METERS
  );

  const io = getIo();
  const payload = {
    rideId: ride.id,
    passengerId: ride.passenger_id,
    originAddress: ride.origin_address,
    originLatitude: ride.origin_latitude,
    originLongitude: ride.origin_longitude,
    destinationAddress: ride.destination_address,
    destinationLatitude: ride.destination_latitude,
    destinationLongitude: ride.destination_longitude,
    proposedPrice: ride.proposed_price,
    currency: ride.currency,
    expiresAt: ride.offer_expiry_at,
  };

  for (const driver of drivers) {
    io.to(`driver:${driver.driverId}`).emit('trip:new_request', payload);
    sendPushToUser(driver.userId, {
      title: '¡Nueva solicitud de viaje!',
      body: `${ride.origin_address} → ${ride.destination_address} | $${ride.proposed_price}`,
      data: { rideId: ride.id as string, type: 'new_request' },
    }).catch(() => {});
  }
}

export async function listRides(req: Request, res: Response, next: NextFunction) {
  try {
    const isDriver = req.user!.role === 'driver';
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    let whereClause: string;
    let params: unknown[];

    if (isDriver) {
      const { rows: [driver] } = await query(
        `SELECT id FROM drivers WHERE user_id = $1`, [req.user!.id]
      );
      whereClause = `r.driver_id = $1 AND r.status = 'completed'`;
      params = [driver?.id, limit, offset];
    } else {
      whereClause = `r.passenger_id = $1 AND r.status IN ('completed','canceled')`;
      params = [req.user!.id, limit, offset];
    }

    const { rows } = await query(
      `SELECT r.*, u.first_name || ' ' || u.last_name AS passenger_name
       FROM rides r
       JOIN users u ON u.id = r.passenger_id
       WHERE ${whereClause}
       ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`,
      params
    );
    res.json(success(rows));
  } catch (err) { next(err); }
}

export async function getActiveRide(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    let rideQuery: string;
    let params: unknown[];

    if (req.user!.role === 'driver') {
      const { rows: [d] } = await query(`SELECT id FROM drivers WHERE user_id=$1`, [userId]);
      rideQuery = `SELECT r.* FROM rides r WHERE r.driver_id=$1 AND r.status IN ('accepted','driver_en_route','arrived','in_progress') LIMIT 1`;
      params = [d?.id];
    } else {
      rideQuery = `SELECT r.* FROM rides r WHERE r.passenger_id=$1 AND r.status IN ('searching','negotiating','accepted','driver_en_route','arrived','in_progress') LIMIT 1`;
      params = [userId];
    }

    const { rows: [ride] } = await query(rideQuery, params);
    res.json(success(ride ?? null));
  } catch (err) { next(err); }
}

export async function getRide(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows: [ride] } = await query(
      `SELECT r.*,
              u.first_name || ' ' || u.last_name AS passenger_name, u.phone AS passenger_phone,
              du.first_name || ' ' || du.last_name AS driver_name, du.phone AS driver_phone,
              v.make AS vehicle_make, v.model AS vehicle_model, v.color AS vehicle_color, v.plate_number
       FROM rides r
       JOIN users u ON u.id = r.passenger_id
       LEFT JOIN drivers d ON d.id = r.driver_id
       LEFT JOIN users du ON du.id = d.user_id
       LEFT JOIN vehicles v ON v.driver_id = d.id AND v.is_active = true
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (!ride) throw new NotFoundError('Ride not found');
    res.json(success(ride));
  } catch (err) { next(err); }
}

export async function cancelRide(req: Request, res: Response, next: NextFunction) {
  try {
    const { reason } = req.body as { reason?: string };
    const { rows: [ride] } = await query(
      `SELECT * FROM rides WHERE id = $1`, [req.params.id]
    );
    if (!ride) throw new NotFoundError('Ride not found');

    const cancelable = ['searching','negotiating','accepted','driver_en_route','scheduled'];
    if (!cancelable.includes(ride.status)) {
      throw new BadRequestError(`Cannot cancel ride with status: ${ride.status}`);
    }

    const isDriver = req.user!.role === 'driver';
    await query(
      `UPDATE rides SET status='canceled', cancel_reason=$1, canceled_by=$2,
       canceled_at=NOW(), updated_at=NOW() WHERE id=$3`,
      [reason ?? null, isDriver ? 'driver' : 'passenger', req.params.id]
    );

    const io = getIo();
    io.to(`ride:${ride.id}`).emit('trip:canceled', {
      rideId: ride.id, reason: reason ?? '', canceledBy: isDriver ? 'driver' : 'passenger',
    });

    res.json(success({ canceled: true }));
  } catch (err) { next(err); }
}

export async function markArrived(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows: [ride] } = await query(
      `UPDATE rides SET status='arrived', arrived_at=NOW(), updated_at=NOW()
       WHERE id=$1 AND status='driver_en_route' RETURNING *`,
      [req.params.id]
    );
    if (!ride) throw new NotFoundError('Ride not found or wrong status');

    const io = getIo();
    io.to(`ride:${ride.id}`).emit('trip:driver_arrived', {
      rideId: ride.id, timestamp: new Date().toISOString(),
    });

    sendPushToUser(ride.passenger_id, {
      title: '¡Tu chofer llegó!',
      body: 'El chofer está esperándote',
      data: { rideId: ride.id, type: 'driver_arrived' },
    }).catch(() => {});

    res.json(success({ status: 'arrived' }));
  } catch (err) { next(err); }
}

export async function startRide(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows: [ride] } = await query(
      `UPDATE rides SET status='in_progress', started_at=NOW(), updated_at=NOW()
       WHERE id=$1 AND status='arrived' RETURNING *`,
      [req.params.id]
    );
    if (!ride) throw new NotFoundError('Ride not found or wrong status');

    const io = getIo();
    io.to(`ride:${ride.id}`).emit('trip:started', {
      rideId: ride.id, startedAt: ride.started_at,
    });

    res.json(success({ status: 'in_progress' }));
  } catch (err) { next(err); }
}

export async function completeRide(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows: [ride] } = await query(
      `UPDATE rides SET status='completed', completed_at=NOW(), updated_at=NOW()
       WHERE id=$1 AND status='in_progress' RETURNING *`,
      [req.params.id]
    );
    if (!ride) throw new NotFoundError('Ride not found or wrong status');

    // Update driver stats
    await query(
      `UPDATE drivers SET total_trips = total_trips + 1,
       total_earnings = total_earnings + COALESCE($1, 0), updated_at=NOW()
       WHERE id = $2`,
      [ride.final_price, ride.driver_id]
    );

    const io = getIo();
    io.to(`ride:${ride.id}`).emit('trip:completed', {
      rideId: ride.id,
      finalPrice: ride.final_price,
      currency: ride.currency,
    });

    // Schedule driver trip fee charge
    const { scheduleTripFeeCharge } = await import('../jobs/queue');
    await scheduleTripFeeCharge(ride.id, ride.driver_id, 5 * 60 * 1000);

    res.json(success({ status: 'completed', finalPrice: ride.final_price }));
  } catch (err) { next(err); }
}

export async function rateRide(req: Request, res: Response, next: NextFunction) {
  try {
    const { stars, comment, tags } = req.body as {
      stars: number; comment?: string; tags?: string[];
    };

    const { rows: [ride] } = await query(
      `SELECT * FROM rides WHERE id=$1 AND status='completed'`, [req.params.id]
    );
    if (!ride) throw new NotFoundError('Completed ride not found');

    const { rows: [driver] } = await query(
      `SELECT id FROM drivers WHERE id=$1`, [ride.driver_id]
    );

    await query(
      `INSERT INTO ratings (ride_id, rated_by, rated_user_id, stars, comment, tags)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (ride_id) DO UPDATE SET stars=$4, comment=$5, tags=$6`,
      [ride.id, req.user!.id, driver?.id, stars, comment ?? null, tags ?? null]
    );

    // Recalculate driver average
    if (driver) {
      await query(
        `UPDATE drivers SET
           rating_average = (SELECT AVG(stars) FROM ratings WHERE rated_user_id = $1),
           rating_count = (SELECT COUNT(*) FROM ratings WHERE rated_user_id = $1)
         WHERE id = $1`,
        [driver.id]
      );
    }

    res.json(success({ rated: true }));
  } catch (err) { next(err); }
}

export async function getFareEstimate(req: Request, res: Response, next: NextFunction) {
  try {
    const { originLat, originLng, destLat, destLng } = req.query;

    // Simple distance-based calculation
    const lat1 = parseFloat(originLat as string);
    const lng1 = parseFloat(originLng as string);
    const lat2 = parseFloat(destLat as string);
    const lng2 = parseFloat(destLng as string);

    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    const distanceMeters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceKm = distanceMeters / 1000;

    const { rows: [config] } = await query(
      `SELECT * FROM fare_configs WHERE is_active=true LIMIT 1`
    );
    const base = config?.base_fare ?? 1.50;
    const perKm = config?.per_km_rate ?? 0.80;
    const suggested = Math.max(base + distanceKm * perKm, config?.min_fare ?? 3);

    res.json(success({
      distanceMeters: Math.round(distanceMeters),
      suggestedPrice: Math.round(suggested * 100) / 100,
      minPrice: Math.round(suggested * 0.8 * 100) / 100,
      maxPrice: Math.round(suggested * 1.4 * 100) / 100,
      currency: config?.currency ?? 'USD',
    }));
  } catch (err) { next(err); }
}

export async function getRoute(_req: Request, res: Response, next: NextFunction) {
  try {
    // Returns basic route info; real implementation would call Google Directions API
    res.json(success({ message: 'Use Google Maps client-side for route rendering' }));
  } catch (err) { next(err); }
}
