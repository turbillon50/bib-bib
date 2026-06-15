import { Resend } from 'resend';
import { env } from '../config/env';
import { query } from '../config/database';
import { logger } from '../utils/logger';

const resend = new Resend(env.RESEND_API_KEY);

export interface EmailNotificationPayload {
  subject: string;
  html: string;
  text?: string;
}

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendEmail(
  to: string,
  payload: EmailNotificationPayload
): Promise<void> {
  try {
    const result = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    await logNotification({
      email: to,
      channel: 'email',
      type: 'email',
      payload,
      status: 'sent',
    });
    logger.debug('Email sent', { to, subject: payload.subject });
  } catch (error) {
    const err = error as Error;
    logger.error('Email send failed', { error: err.message, to });
    await logNotification({
      email: to,
      channel: 'email',
      type: 'email',
      payload,
      status: 'failed',
      error: err.message,
    });
    throw error;
  }
}

export async function sendVerificationEmail(
  email: string,
  verificationLink: string
): Promise<void> {
  const payload: EmailNotificationPayload = {
    subject: 'Verify your Bib-Bib account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email</h2>
        <p>Click the link below to verify your Bib-Bib account:</p>
        <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #007AFF; color: white; text-decoration: none; border-radius: 5px;">
          Verify Email
        </a>
        <p>Or copy this link: ${verificationLink}</p>
        <p>This link expires in 24 hours.</p>
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #e0e0e0;">
        <p style="color: #666; font-size: 12px;">
          If you didn't request this verification, please ignore this email.
        </p>
      </div>
    `,
    text: `Verify your email by visiting: ${verificationLink}`,
  };

  await sendEmail(email, payload);
}

export async function sendRideNotificationEmail(
  email: string,
  rideData: {
    rideId: string;
    pickupAddress: string;
    dropoffAddress: string;
    estimatedFare: number;
  }
): Promise<void> {
  const payload: EmailNotificationPayload = {
    subject: 'New Ride Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Ride Request</h2>
        <p><strong>From:</strong> ${rideData.pickupAddress}</p>
        <p><strong>To:</strong> ${rideData.dropoffAddress}</p>
        <p><strong>Estimated Fare:</strong> $${(rideData.estimatedFare / 100).toFixed(2)}</p>
        <p>Check the app to view this ride request.</p>
      </div>
    `,
  };

  await sendEmail(email, payload);
}

export async function sendOfferNotificationEmail(
  email: string,
  offerData: {
    driverName: string;
    amount: number;
    rideId: string;
  }
): Promise<void> {
  const payload: EmailNotificationPayload = {
    subject: 'Driver Offer Received',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Driver Offer Received</h2>
        <p>${offerData.driverName} has offered a ride for <strong>$${(offerData.amount / 100).toFixed(2)}</strong></p>
        <p>Check the app to accept or decline this offer.</p>
      </div>
    `,
  };

  await sendEmail(email, payload);
}

export async function sendRideStatusEmail(
  email: string,
  status: string,
  rideData: { rideId: string; driverName?: string; estimatedArrival?: string }
): Promise<void> {
  const messages: Record<
    string,
    { subject: string; message: string }
  > = {
    driver_arrived: {
      subject: 'Driver Arrived',
      message: 'Your driver has arrived at the pickup location.',
    },
    trip_started: {
      subject: 'Trip Started',
      message: 'Your ride has begun. Enjoy your trip!',
    },
    trip_completed: {
      subject: 'Trip Completed',
      message: 'Your ride is complete. Please rate your experience.',
    },
    cancelled: {
      subject: 'Ride Cancelled',
      message: 'Your ride has been cancelled.',
    },
  };

  const msg = messages[status];
  if (!msg) return;

  const payload: EmailNotificationPayload = {
    subject: msg.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${msg.subject}</h2>
        <p>${msg.message}</p>
        ${rideData.driverName ? `<p><strong>Driver:</strong> ${rideData.driverName}</p>` : ''}
        ${rideData.estimatedArrival ? `<p><strong>Estimated Arrival:</strong> ${rideData.estimatedArrival}</p>` : ''}
      </div>
    `,
  };

  await sendEmail(email, payload);
}

export async function notifyDriverNewRide(
  email: string | null,
  driverId: string,
  rideData: {
    rideId: string;
    pickupAddress: string;
    dropoffAddress: string;
    passengerPrice: number;
    distanceMeters: number;
  }
): Promise<void> {
  if (!email) return;

  await sendRideNotificationEmail(email, {
    rideId: rideData.rideId,
    pickupAddress: rideData.pickupAddress,
    dropoffAddress: rideData.dropoffAddress,
    estimatedFare: rideData.passengerPrice,
  });
}

export async function notifyPassengerOfferReceived(
  email: string | null,
  userId: string,
  offerData: {
    offerId: string;
    rideId: string;
    driverName: string;
    amount: number;
  }
): Promise<void> {
  if (!email) return;

  await sendOfferNotificationEmail(email, {
    driverName: offerData.driverName,
    amount: offerData.amount,
    rideId: offerData.rideId,
  });
}

export async function notifyDriverOfferAccepted(
  email: string | null,
  driverId: string,
  rideId: string
): Promise<void> {
  if (!email) return;

  const payload: EmailNotificationPayload = {
    subject: 'Offer Accepted!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Offer Accepted!</h2>
        <p>Your offer was accepted. Navigate to the pickup location.</p>
      </div>
    `,
  };

  await sendEmail(email, payload);
}

export async function notifyRideStatusChange(
  email: string | null,
  userId: string,
  status: string,
  rideId: string
): Promise<void> {
  if (!email) return;

  await sendRideStatusEmail(email, status, { rideId });
}

export async function sendEmailToUser(
  userId: string,
  payload: EmailNotificationPayload
): Promise<void> {
  try {
    const { rows } = await query<{ email: string | null }>(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );
    if (rows.length === 0 || !rows[0].email) return;
    await sendEmail(rows[0].email, payload);
  } catch (error) {
    logger.error('sendEmailToUser failed', {
      userId,
      error: (error as Error).message,
    });
  }
}

async function logNotification(data: {
  email?: string;
  userId?: string;
  channel: string;
  type: string;
  payload: unknown;
  status: string;
  error?: string;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO notification_logs (user_id, channel, type, payload, status, error)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        data.userId ?? null,
        data.channel,
        data.type,
        JSON.stringify(data.payload),
        data.status,
        data.error ?? null,
      ]
    );
  } catch (err) {
    logger.error('Failed to log notification', {
      error: (err as Error).message,
    });
  }
}

// ============================================================
// SMS (OTP)
// ============================================================

/**
 * Send an OTP code via SMS.
 * Uses Twilio if TWILIO_* env vars are present; otherwise falls back to
 * logging the code (useful in development) and recording the attempt.
 */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const message = `Tu código de verificación Bib-Bib es: ${code}. Expira en 5 minutos.`;

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_FROM_NUMBER;

  try {
    if (twilioSid && twilioToken && twilioFrom) {
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const body = new URLSearchParams({
        To: phone,
        From: twilioFrom,
        Body: message,
      });

      const response: { ok: boolean; status: number; text(): Promise<string> } = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Twilio SMS failed (${response.status}): ${errText}`);
      }

      logger.info('OTP SMS sent via Twilio', { phone });
    } else {
      // No SMS provider configured - log for development/testing
      logger.warn('No SMS provider configured (TWILIO_* missing). OTP logged instead.', {
        phone,
        code,
      });
    }

    await logNotification({
      channel: 'sms',
      type: 'otp',
      payload: { phone },
      status: 'sent',
    });
  } catch (error) {
    const err = error as Error;
    logger.error('OTP SMS send failed', { error: err.message, phone });
    await logNotification({
      channel: 'sms',
      type: 'otp',
      payload: { phone },
      status: 'failed',
      error: err.message,
    });
    // Do not throw: OTP is stored server-side; SMS delivery failure should
    // not crash the request flow. Client can retry.
  }
}

// ============================================================
// PUSH NOTIFICATIONS (FCM)
// ============================================================

/**
 * Send a push notification to a user via Firebase Cloud Messaging.
 * Looks up the user's fcm_token; silently no-ops when Firebase is not
 * configured or the user has no registered device token.
 */
export async function sendPushToUser(
  userId: string,
  notification: PushNotificationData
): Promise<void> {
  try {
    if (!userId) return;

    const { getMessaging, isFirebaseConfigured } = await import('../config/firebase');

    if (!isFirebaseConfigured()) {
      logger.debug('Push skipped: Firebase not configured', { userId });
      return;
    }

    const { rows } = await query<{ fcm_token: string | null }>(
      'SELECT fcm_token FROM users WHERE id = $1',
      [userId]
    );

    const fcmToken = rows[0]?.fcm_token;
    if (!fcmToken) {
      logger.debug('Push skipped: user has no FCM token', { userId });
      return;
    }

    const messaging = getMessaging();
    if (!messaging) return;

    const messageId = await messaging.send({
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data ?? {},
    });

    await logNotification({
      userId,
      channel: 'push',
      type: 'push',
      payload: notification,
      status: 'sent',
    });
    logger.debug('Push notification sent', { userId, messageId });
  } catch (error) {
    const err = error as Error;
    logger.error('Push notification failed', { userId, error: err.message });
    await logNotification({
      userId,
      channel: 'push',
      type: 'push',
      payload: notification,
      status: 'failed',
      error: err.message,
    });
    // Swallow errors: push failures must never break business flows.
  }
}
