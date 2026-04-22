import { getMessaging } from '../config/firebase';
import twilio from 'twilio';
import { env } from '../config/env';
import { query } from '../config/database';
import { logger } from '../utils/logger';

let twilioClient: twilio.Twilio | null = null;

function getTwilioClient(): twilio.Twilio {
  if (!twilioClient) {
    twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface SmsPayload {
  to: string;
  message: string;
}

export async function sendPushNotification(
  fcmToken: string,
  payload: PushNotificationPayload,
  userId?: string
): Promise<void> {
  try {
    const messaging = getMessaging();
    await messaging.send({
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
      },
      data: payload.data ?? {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });

    await logNotification({
      userId,
      channel: 'fcm',
      type: payload.data?.type ?? 'push',
      payload,
      status: 'sent',
    });
    logger.debug('Push notification sent', { title: payload.title });
  } catch (error) {
    const err = error as Error;
    logger.error('FCM push notification failed', { error: err.message, fcmToken });
    await logNotification({
      userId,
      channel: 'fcm',
      type: payload.data?.type ?? 'push',
      payload,
      status: 'failed',
      error: err.message,
    });
    // Don't throw - notification failure shouldn't break the flow
  }
}

export async function sendPushToMultiple(
  tokens: string[],
  payload: PushNotificationPayload
): Promise<void> {
  if (tokens.length === 0) return;

  try {
    const messaging = getMessaging();
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data ?? {},
      android: { priority: 'high' },
    });

    logger.debug('Multicast push sent', {
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
    logger.error('Multicast push failed', { error: (error as Error).message });
  }
}

export async function sendSms(payload: SmsPayload): Promise<void> {
  try {
    const client = getTwilioClient();
    await client.messages.create({
      body: payload.message,
      from: env.TWILIO_PHONE_NUMBER,
      to: payload.to,
    });

    await logNotification({
      channel: 'sms',
      type: 'sms',
      payload,
      status: 'sent',
    });
    logger.debug('SMS sent', { to: payload.to });
  } catch (error) {
    const err = error as Error;
    logger.error('SMS send failed', { error: err.message, to: payload.to });
    await logNotification({
      channel: 'sms',
      type: 'sms',
      payload,
      status: 'failed',
      error: err.message,
    });
    throw error;
  }
}

export async function sendOtpSms(phone: string, code: string): Promise<void> {
  await sendSms({
    to: phone,
    message: `Your RideMe verification code is: ${code}. Valid for ${env.OTP_EXPIRES_IN / 60} minutes. Do not share this code.`,
  });
}

export async function notifyDriverNewRide(
  fcmToken: string | null,
  driverId: string,
  rideData: {
    rideId: string;
    pickupAddress: string;
    dropoffAddress: string;
    passengerPrice: number;
    distanceMeters: number;
  }
): Promise<void> {
  if (!fcmToken) return;

  await sendPushNotification(
    fcmToken,
    {
      title: 'New Ride Request',
      body: `${rideData.pickupAddress} → ${rideData.dropoffAddress}`,
      data: {
        type: 'new_ride_request',
        rideId: rideData.rideId,
        passengerPrice: rideData.passengerPrice.toString(),
        distanceMeters: rideData.distanceMeters.toString(),
      },
    },
    undefined
  );
}

export async function notifyPassengerOfferReceived(
  fcmToken: string | null,
  userId: string,
  offerData: {
    offerId: string;
    rideId: string;
    driverName: string;
    amount: number;
  }
): Promise<void> {
  if (!fcmToken) return;

  await sendPushNotification(
    fcmToken,
    {
      title: 'Driver Offer Received',
      body: `${offerData.driverName} offered $${(offerData.amount / 100).toFixed(2)}`,
      data: {
        type: 'offer_received',
        offerId: offerData.offerId,
        rideId: offerData.rideId,
      },
    },
    userId
  );
}

export async function notifyDriverOfferAccepted(
  fcmToken: string | null,
  driverId: string,
  rideId: string
): Promise<void> {
  if (!fcmToken) return;

  await sendPushNotification(
    fcmToken,
    {
      title: 'Offer Accepted!',
      body: 'Your offer was accepted. Navigate to pickup location.',
      data: {
        type: 'offer_accepted',
        rideId,
      },
    }
  );
}

export async function notifyRideStatusChange(
  fcmToken: string | null,
  userId: string,
  status: string,
  rideId: string
): Promise<void> {
  if (!fcmToken) return;

  const messages: Record<string, { title: string; body: string }> = {
    driver_arrived: { title: 'Driver Arrived', body: 'Your driver is at the pickup location.' },
    trip_started: { title: 'Trip Started', body: 'Your ride has begun. Enjoy your trip!' },
    trip_completed: { title: 'Trip Completed', body: 'You have arrived. Rate your driver!' },
    cancelled: { title: 'Ride Cancelled', body: 'Your ride has been cancelled.' },
  };

  const msg = messages[status];
  if (!msg) return;

  await sendPushNotification(fcmToken, {
    ...msg,
    data: { type: status, rideId },
  }, userId);
}

export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<void> {
  try {
    const { rows } = await query<{ fcm_token: string | null }>(
      'SELECT fcm_token FROM users WHERE id = $1',
      [userId]
    );
    if (rows.length === 0 || !rows[0].fcm_token) return;
    await sendPushNotification(rows[0].fcm_token, payload, userId);
  } catch (error) {
    logger.error('sendPushToUser failed', { userId, error: (error as Error).message });
  }
}

async function logNotification(data: {
  userId?: string;
  driverId?: string;
  channel: string;
  type: string;
  payload: unknown;
  status: string;
  error?: string;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO notification_logs (user_id, driver_id, channel, type, payload, status, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.userId ?? null,
        data.driverId ?? null,
        data.channel,
        data.type,
        JSON.stringify(data.payload),
        data.status,
        data.error ?? null,
      ]
    );
  } catch (err) {
    logger.error('Failed to log notification', { error: (err as Error).message });
  }
}
