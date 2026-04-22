import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { getRedisClient } from '../config/redis';
import { getIo } from '../socket/socketServer';
import { getNearbyOnlineDrivers } from '../services/location.service';
import { success, created } from '../utils/response';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const registerDriverSchema = z.object({
  licenseNumber: z.string().min(1),
  licenseExpiryDate: z.string(),
  vehicleMake: z.string().min(1),
  vehicleModel: z.string().min(1),
  vehicleYear: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  vehicleColor: z.string().min(1),
  vehiclePlate: z.string().min(1),
  vehicleType: z.enum(['sedan', 'suv', 'van', 'motorcycle']).default('sedan'),
});

export async function registerDriver(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerDriverSchema.parse(req.body);
    const userId = req.user!.id;

    // Update user role to driver
    await query(`UPDATE users SET role = 'driver', updated_at = NOW() WHERE id = $1`, [userId]);

    const { rows: [driver] } = await query(
      `INSERT INTO drivers (user_id, license_number, license_expiry_date, is_online, is_approved)
       VALUES ($1, $2, $3, false, false)
       ON CONFLICT (user_id) DO UPDATE SET license_number = $2, license_expiry_date = $3
       RETURNING *`,
      [userId, input.licenseNumber, input.licenseExpiryDate]
    );

    // Create/update vehicle
    await query(
      `INSERT INTO vehicles (driver_id, make, model, year, color, plate_number, vehicle_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (plate_number) DO UPDATE
         SET make=$2, model=$3, year=$4, color=$5, vehicle_type=$7`,
      [driver.id, input.vehicleMake, input.vehicleModel, input.vehicleYear,
       input.vehicleColor, input.vehiclePlate, input.vehicleType]
    );

    res.status(201).json(created({ driver }, 'Driver registered, pending approval'));
  } catch (err) { next(err); }
}

export async function getDriverProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows: [driver] } = await query(
      `SELECT d.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
              v.make, v.model, v.year, v.color, v.plate_number, v.vehicle_type
       FROM drivers d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN vehicles v ON v.driver_id = d.id AND v.is_active = true
       WHERE d.user_id = $1`,
      [req.user!.id]
    );
    if (!driver) throw new NotFoundError('Driver profile not found');
    res.json(success(driver));
  } catch (err) { next(err); }
}

export async function updateDriverProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const { licenseNumber, licenseExpiryDate } = req.body;
    const { rows: [driver] } = await query(
      `UPDATE drivers SET
         license_number = COALESCE($1, license_number),
         license_expiry_date = COALESCE($2, license_expiry_date),
         updated_at = NOW()
       WHERE user_id = $3 RETURNING *`,
      [licenseNumber, licenseExpiryDate, req.user!.id]
    );
    res.json(success(driver));
  } catch (err) { next(err); }
}

export async function toggleOnlineStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { isOnline, latitude, longitude } = req.body as {
      isOnline: boolean; latitude?: number; longitude?: number;
    };

    const { rows: [driver] } = await query(
      `SELECT * FROM drivers WHERE user_id = $1`, [req.user!.id]
    );
    if (!driver) throw new NotFoundError('Driver not found');

    // Block if subscription inactive
    if (isOnline && driver.subscription_status !== 'active') {
      throw new ForbiddenError('Active subscription required to go online');
    }

    const locationUpdate = isOnline && latitude && longitude
      ? `current_latitude = ${latitude}, current_longitude = ${longitude},
         location_geom = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,`
      : '';

    const { rows: [updated] } = await query(
      `UPDATE drivers SET ${locationUpdate} is_online = $1, updated_at = NOW()
       WHERE user_id = $2 RETURNING id, is_online, subscription_status`,
      [isOnline, req.user!.id]
    );

    // Update Redis cache of online drivers
    const redis = getRedisClient();
    if (isOnline && latitude && longitude) {
      await redis.geoadd('online_drivers', longitude, latitude, driver.id);
      await redis.hset(`driver:${driver.id}`, { lat: latitude, lng: longitude, userId: req.user!.id });
      await redis.expire(`driver:${driver.id}`, 3600);
    } else {
      await redis.zrem('online_drivers', driver.id);
      await redis.del(`driver:${driver.id}`);
    }

    // Notify nearby passengers of driver availability change
    const io = getIo();
    io.emit('drivers:availability_changed', { driverId: driver.id, isOnline });

    res.json(success({ isOnline: updated.is_online }));
  } catch (err) { next(err); }
}

export async function updateLocation(req: Request, res: Response, next: NextFunction) {
  try {
    const { latitude, longitude, heading } = req.body as {
      latitude: number; longitude: number; heading?: number;
    };

    const { rows: [driver] } = await query(
      `UPDATE drivers SET
         current_latitude = $1,
         current_longitude = $2,
         location_geom = ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
         current_location_updated_at = NOW(),
         updated_at = NOW()
       WHERE user_id = $3 RETURNING id`,
      [latitude, longitude, req.user!.id]
    );

    // Update Redis
    const redis = getRedisClient();
    await redis.geoadd('online_drivers', longitude, latitude, driver.id);
    await redis.hset(`driver:${driver.id}`, { lat: latitude, lng: longitude });

    // Broadcast to active ride passenger
    const { rows: [activeRide] } = await query(
      `SELECT id, passenger_id FROM rides
       WHERE driver_id = $1 AND status IN ('driver_en_route','arrived','in_progress')
       LIMIT 1`,
      [driver.id]
    );

    if (activeRide) {
      const io = getIo();
      io.to(`passenger:${activeRide.passenger_id}`).emit('driver:location_updated', {
        driverId: driver.id, latitude, longitude, heading, timestamp: new Date().toISOString(),
      });
    }

    res.json(success({ updated: true }));
  } catch (err) { next(err); }
}

export async function getEarnings(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows: [driver] } = await query(
      `SELECT id FROM drivers WHERE user_id = $1`, [req.user!.id]
    );
    if (!driver) throw new NotFoundError('Driver not found');

    const { rows } = await query(
      `SELECT
         SUM(CASE WHEN completed_at >= NOW() - INTERVAL '1 day' THEN final_price ELSE 0 END) AS today_gross,
         SUM(CASE WHEN completed_at >= NOW() - INTERVAL '7 days' THEN final_price ELSE 0 END) AS week_gross,
         SUM(CASE WHEN completed_at >= NOW() - INTERVAL '30 days' THEN final_price ELSE 0 END) AS month_gross,
         COUNT(CASE WHEN completed_at >= NOW() - INTERVAL '1 day' THEN 1 END) AS today_trips,
         COUNT(CASE WHEN completed_at >= NOW() - INTERVAL '7 days' THEN 1 END) AS week_trips,
         COUNT(CASE WHEN completed_at >= NOW() - INTERVAL '30 days' THEN 1 END) AS month_trips,
         COUNT(*) AS total_trips
       FROM rides WHERE driver_id = $1 AND status = 'completed'`,
      [driver.id]
    );

    res.json(success(rows[0]));
  } catch (err) { next(err); }
}

export async function getNearbyDrivers(req: Request, res: Response, next: NextFunction) {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseInt(req.query.radius as string) || 5000;

    const drivers = await getNearbyOnlineDrivers(lat, lng, radius);
    res.json(success(drivers));
  } catch (err) { next(err); }
}
