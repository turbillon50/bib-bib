import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { getIo } from '../socket/socketServer';
import { sendPushToUser } from '../services/notification.service';
import { success, created } from '../utils/response';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { env } from '../config/env';

const createOfferSchema = z.object({
  rideId: z.string().uuid(),
  offeredPrice: z.number().positive(),
  offerType: z.enum(['accept', 'counter']),
  message: z.string().max(200).optional(),
  driverEtaSeconds: z.number().int().positive().optional(),
});

export async function createOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createOfferSchema.parse(req.body);

    // Get driver record
    const { rows: [driver] } = await query(
      `SELECT d.* FROM drivers d WHERE d.user_id=$1`, [req.user!.id]
    );
    if (!driver) throw new ForbiddenError('Driver profile not found');
    if (driver.subscription_status !== 'active') {
      throw new ForbiddenError('Active subscription required to make offers');
    }

    // Get the ride
    const { rows: [ride] } = await query(
      `SELECT * FROM rides WHERE id=$1`, [input.rideId]
    );
    if (!ride) throw new NotFoundError('Ride not found');
    if (!['searching', 'negotiating'].includes(ride.status)) {
      throw new BadRequestError('Ride is no longer accepting offers');
    }
    if (new Date(ride.offer_expiry_at) < new Date()) {
      throw new BadRequestError('Offer window has expired');
    }

    const expiresAt = new Date(Date.now() + env.OFFER_EXPIRY_SECONDS * 1000);

    const { rows: [offer] } = await query(
      `INSERT INTO ride_offers (ride_id, driver_id, offered_price, offer_type, message, driver_eta_seconds, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (ride_id, driver_id) DO UPDATE
         SET offered_price=$3, offer_type=$4, message=$5, driver_eta_seconds=$6,
             expires_at=$7, status='pending', updated_at=NOW()
       RETURNING *`,
      [input.rideId, driver.id, input.offeredPrice, input.offerType,
       input.message ?? null, input.driverEtaSeconds ?? null, expiresAt]
    );

    // Update ride status to negotiating
    await query(
      `UPDATE rides SET status='negotiating', updated_at=NOW() WHERE id=$1 AND status='searching'`,
      [input.rideId]
    );

    // Get driver info for the offer notification
    const { rows: [driverUser] } = await query(
      `SELECT u.first_name, u.last_name, u.avatar_url, d.rating_average, d.total_trips,
              v.make, v.model, v.color, v.plate_number
       FROM users u
       JOIN drivers d ON d.user_id = u.id
       LEFT JOIN vehicles v ON v.driver_id = d.id AND v.is_active = true
       WHERE u.id = $1`,
      [req.user!.id]
    );

    const payload = {
      offer: {
        ...offer,
        driver: {
          id: driver.id, userId: req.user!.id,
          firstName: driverUser?.first_name, lastName: driverUser?.last_name,
          avatarUrl: driverUser?.avatar_url, ratingAverage: driver.rating_average,
          totalTrips: driver.total_trips,
          vehicle: { make: driverUser?.make, model: driverUser?.model,
                     color: driverUser?.color, plateNumber: driverUser?.plate_number },
        },
      },
    };

    const io = getIo();
    io.to(`passenger:${ride.passenger_id}`).emit('trip:offer_received', payload);

    sendPushToUser(ride.passenger_id, {
      title: '¡Nuevo chofer disponible!',
      body: `${driverUser?.first_name} ofrece $${input.offeredPrice}`,
      data: { rideId: input.rideId, offerId: offer.id, type: 'offer_received' },
    }).catch(() => {});

    res.status(201).json(created({ offer }, 'Offer submitted'));
  } catch (err) { next(err); }
}

export async function acceptOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows: [offer] } = await query(
      `SELECT o.*, r.passenger_id, r.id AS ride_id FROM ride_offers o
       JOIN rides r ON r.id = o.ride_id
       WHERE o.id=$1 AND o.status='pending'`,
      [req.params.id]
    );
    if (!offer) throw new NotFoundError('Offer not found or already processed');
    if (offer.passenger_id !== req.user!.id) throw new ForbiddenError('Not your ride');

    // Accept this offer
    await query(
      `UPDATE ride_offers SET status='accepted', updated_at=NOW() WHERE id=$1`, [offer.id]
    );

    // Reject all other pending offers for this ride
    await query(
      `UPDATE ride_offers SET status='rejected', updated_at=NOW()
       WHERE ride_id=$1 AND id!=$2 AND status='pending'`,
      [offer.ride_id, offer.id]
    );

    // Assign driver and update ride
    await query(
      `UPDATE rides SET driver_id=$1, final_price=$2, status='accepted', updated_at=NOW()
       WHERE id=$3`,
      [offer.driver_id, offer.offered_price, offer.ride_id]
    );

    // Get full driver info
    const { rows: [info] } = await query(
      `SELECT u.first_name, u.last_name, u.avatar_url, d.rating_average,
              v.make, v.model, v.color, v.plate_number
       FROM drivers d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN vehicles v ON v.driver_id = d.id AND v.is_active=true
       WHERE d.id=$1`,
      [offer.driver_id]
    );

    const acceptedPayload = {
      rideId: offer.ride_id, driverId: offer.driver_id,
      driverName: `${info?.first_name} ${info?.last_name}`,
      driverAvatar: info?.avatar_url, driverRating: info?.rating_average,
      vehicleMake: info?.make, vehicleModel: info?.model,
      vehicleColor: info?.color, vehiclePlate: info?.plate_number,
      finalPrice: offer.offered_price, etaSeconds: offer.driver_eta_seconds,
    };

    const io = getIo();
    io.to(`ride:${offer.ride_id}`).emit('trip:accepted', acceptedPayload);
    io.to(`driver:${offer.driver_id}`).emit('trip:offer_accepted', acceptedPayload);

    // Get driver user_id for notification
    const { rows: [driverRow] } = await query(
      `SELECT user_id FROM drivers WHERE id=$1`, [offer.driver_id]
    );
    sendPushToUser(driverRow?.user_id, {
      title: '¡Tu oferta fue aceptada!',
      body: 'Dirígete al punto de recogida',
      data: { rideId: offer.ride_id, type: 'offer_accepted' },
    }).catch(() => {});

    res.json(success({ accepted: true, finalPrice: offer.offered_price }));
  } catch (err) { next(err); }
}

export async function rejectOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows: [offer] } = await query(
      `SELECT o.*, r.passenger_id FROM ride_offers o
       JOIN rides r ON r.id = o.ride_id
       WHERE o.id=$1 AND o.status='pending'`,
      [req.params.id]
    );
    if (!offer) throw new NotFoundError('Offer not found');
    if (offer.passenger_id !== req.user!.id) throw new ForbiddenError('Not your ride');

    await query(`UPDATE ride_offers SET status='rejected', updated_at=NOW() WHERE id=$1`, [offer.id]);

    const io = getIo();
    io.to(`driver:${offer.driver_id}`).emit('trip:offer_rejected', { offerId: offer.id });

    res.json(success({ rejected: true }));
  } catch (err) { next(err); }
}

export async function withdrawOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows: [driver] } = await query(
      `SELECT id FROM drivers WHERE user_id=$1`, [req.user!.id]
    );

    await query(
      `UPDATE ride_offers SET status='withdrawn', updated_at=NOW()
       WHERE id=$1 AND driver_id=$2 AND status='pending'`,
      [req.params.id, driver?.id]
    );
    res.json(success({ withdrawn: true }));
  } catch (err) { next(err); }
}

export async function getOffersForRide(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows } = await query(
      `SELECT o.*, u.first_name, u.last_name, u.avatar_url, d.rating_average,
              v.make, v.model, v.color, v.plate_number
       FROM ride_offers o
       JOIN drivers d ON d.id = o.driver_id
       JOIN users u ON u.id = d.user_id
       LEFT JOIN vehicles v ON v.driver_id = d.id AND v.is_active=true
       WHERE o.ride_id=$1 AND o.status='pending'
       ORDER BY o.offered_price ASC`,
      [req.params.rideId]
    );
    res.json(success(rows));
  } catch (err) { next(err); }
}
