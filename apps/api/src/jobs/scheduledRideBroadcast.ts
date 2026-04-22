import { query } from '../config/database';
import { getNearbyOnlineDrivers } from '../services/location.service';
import { sendPushToUser } from '../services/notification.service';
import { getIo } from '../socket/socketServer';
import { env } from '../config/env';

export async function broadcastRideToNearbyDrivers(ride: Record<string, unknown>): Promise<void> {
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
    isScheduled: true,
    scheduledFor: ride.scheduled_for,
    expiresAt: ride.offer_expiry_at,
  };

  for (const driver of drivers) {
    io.to(`driver:${driver.driverId}`).emit('trip:new_request', payload);
    sendPushToUser(driver.userId, {
      title: '¡Viaje programado disponible!',
      body: `${ride.origin_address} → ${ride.destination_address}`,
      data: { rideId: ride.id as string, type: 'scheduled_request' },
    }).catch(() => {});
  }
}
