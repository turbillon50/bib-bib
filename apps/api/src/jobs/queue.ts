import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from '../config/redis';
import { query } from '../config/database';
import { stripe } from '../config/stripe';
import { getIo } from '../socket/socketServer';
import { sendPushToUser } from '../services/notification.service';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let offerExpiryQueue: Queue;
let tripFeeQueue: Queue;
let scheduledRideQueue: Queue;

export async function initializeJobQueues(): Promise<void> {
  const connection = { url: env.REDIS_URL };

  offerExpiryQueue = new Queue('offer-expiry', { connection });
  tripFeeQueue = new Queue('trip-fee', { connection });
  scheduledRideQueue = new Queue('scheduled-rides', { connection });

  // Worker: expire offers
  new Worker('offer-expiry', async (job: Job) => {
    const { rideId } = job.data as { rideId: string };
    const { rows: ride } = await query(
      `SELECT id, passenger_id, status FROM rides WHERE id=$1`, [rideId]
    );
    if (!ride[0] || !['searching', 'negotiating'].includes(ride[0].status)) return;

    await query(
      `UPDATE ride_offers SET status='expired', updated_at=NOW()
       WHERE ride_id=$1 AND status='pending'`,
      [rideId]
    );
    await query(
      `UPDATE rides SET status='expired', updated_at=NOW() WHERE id=$1`, [rideId]
    );

    const io = getIo();
    io.to(`passenger:${ride[0].passenger_id}`).emit('trip:expired', { rideId });
    logger.info(`Ride ${rideId} expired`);
  }, { connection });

  // Worker: charge driver trip fee
  new Worker('trip-fee', async (job: Job) => {
    const { rideId, driverId } = job.data as { rideId: string; driverId: string };

    const { rows: [driver] } = await query(
      `SELECT d.stripe_customer_id, d.subscription_status, d.user_id
       FROM drivers d WHERE d.id=$1`,
      [driverId]
    );
    if (!driver || driver.subscription_status !== 'active') return;

    // Get default payment method
    const { rows: [pm] } = await query(
      `SELECT stripe_payment_method_id FROM payment_methods
       WHERE user_id=$1 AND is_default=true LIMIT 1`,
      [driver.user_id]
    );
    if (!pm) return;

    try {
      const pi = await stripe.paymentIntents.create({
        amount: env.STRIPE_PER_TRIP_AMOUNT,
        currency: 'usd',
        customer: driver.stripe_customer_id,
        payment_method: pm.stripe_payment_method_id,
        confirm: true,
        off_session: true,
        description: `Trip fee - Ride ${rideId}`,
        metadata: { rideId, driverId, type: 'trip_fee' },
      });

      await query(
        `INSERT INTO payments (ride_id, user_id, driver_id, payment_type, amount, currency,
           payment_method, status, stripe_payment_intent_id)
         VALUES ($1,$2,$3,'trip_fee_driver',$4,'usd','card','pending',$5)`,
        [rideId, driver.user_id, driverId, env.STRIPE_PER_TRIP_AMOUNT / 100, pi.id]
      );
      logger.info(`Trip fee charged for ride ${rideId}: ${pi.id}`);
    } catch (err) {
      logger.error(`Trip fee charge failed for ride ${rideId}`, err);
      sendPushToUser(driver.user_id, {
        title: 'Cargo de comisión fallido',
        body: 'No se pudo cobrar la comisión del viaje. Actualiza tu tarjeta.',
        data: { type: 'trip_fee_failed', rideId },
      }).catch(() => {});
    }
  }, { connection });

  // Worker: send scheduled ride notifications
  new Worker('scheduled-rides', async (_job: Job) => {
    const now = new Date();
    const in15min = new Date(now.getTime() + 15 * 60 * 1000);
    const in65min = new Date(now.getTime() + 65 * 60 * 1000);

    const { rows: upcoming } = await query(
      `SELECT * FROM rides
       WHERE is_scheduled=true AND status='scheduled'
         AND scheduled_for BETWEEN $1 AND $2
         AND scheduled_notification_sent=false`,
      [in15min, in65min]
    );

    for (const ride of upcoming) {
      // Start searching for drivers
      await query(
        `UPDATE rides SET status='searching', scheduled_notification_sent=true,
         offer_expiry_at=NOW() + INTERVAL '10 minutes', updated_at=NOW()
         WHERE id=$1`,
        [ride.id]
      );

      // Notify passenger
      sendPushToUser(ride.passenger_id, {
        title: '¡Tu viaje programado está por comenzar!',
        body: 'Buscando chofer para tu viaje',
        data: { rideId: ride.id, type: 'scheduled_search_started' },
      }).catch(() => {});

      // Broadcast to nearby drivers
      const { broadcastRideToNearbyDrivers } = await import('./scheduledRideBroadcast');
      await broadcastRideToNearbyDrivers(ride);
    }
  }, { connection });

  // Cron: check scheduled rides every 5 minutes
  scheduledRideQueue.add('check-scheduled', {}, {
    repeat: { every: 5 * 60 * 1000 },
    removeOnComplete: true,
  });

  logger.info('Job queues initialized');
}

export async function scheduleOfferExpiry(rideId: string, expiresAt: Date): Promise<void> {
  const delay = expiresAt.getTime() - Date.now();
  await offerExpiryQueue.add('expire-offer', { rideId }, { delay: Math.max(delay, 0) });
}

export async function scheduleTripFeeCharge(rideId: string, driverId: string, delayMs: number): Promise<void> {
  await tripFeeQueue.add('charge-trip-fee', { rideId, driverId }, { delay: delayMs });
}
