import Stripe from 'stripe';
import { stripe } from '../config/stripe';
import { env } from '../config/env';
import { query, withTransaction } from '../config/database';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function getOrCreateStripeCustomer(
  userId: string,
  email?: string,
  name?: string
): Promise<string> {
  const { rows } = await query<{ stripe_customer_id: string | null }>(
    `SELECT stripe_customer_id FROM users WHERE id = $1`,
    [userId]
  );

  if (rows.length === 0) throw new NotFoundError('User not found');

  if (rows[0].stripe_customer_id) {
    return rows[0].stripe_customer_id;
  }

  // Create Stripe customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { userId },
  });

  await query(
    `UPDATE users SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2`,
    [customer.id, userId]
  );

  logger.info('Stripe customer created', { userId, customerId: customer.id });
  return customer.id;
}

export async function getOrCreateDriverStripeCustomer(
  driverId: string,
  email?: string,
  name?: string
): Promise<string> {
  const { rows } = await query<{ stripe_customer_id: string | null; user_id: string }>(
    `SELECT stripe_customer_id, user_id FROM drivers WHERE id = $1`,
    [driverId]
  );

  if (rows.length === 0) throw new NotFoundError('Driver not found');

  if (rows[0].stripe_customer_id) {
    return rows[0].stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { driverId },
  });

  await query(
    `UPDATE drivers SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2`,
    [customer.id, driverId]
  );

  return customer.id;
}

export async function createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
  return stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session',
  });
}

export async function listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
  const methods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });
  return methods.data;
}

export async function attachPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  const pm = await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });

  // Save to DB
  await query(
    `INSERT INTO payment_methods
       (user_id, stripe_payment_method_id, brand, last4, exp_month, exp_year, is_default)
     VALUES (
       (SELECT id FROM users WHERE stripe_customer_id = $1),
       $2, $3, $4, $5, $6,
       NOT EXISTS (SELECT 1 FROM payment_methods WHERE user_id = (SELECT id FROM users WHERE stripe_customer_id = $1))
     )
     ON CONFLICT (stripe_payment_method_id) DO NOTHING`,
    [
      customerId,
      pm.id,
      pm.card?.brand,
      pm.card?.last4,
      pm.card?.exp_month,
      pm.card?.exp_year,
    ]
  );

  return pm;
}

export async function detachPaymentMethod(paymentMethodId: string): Promise<void> {
  await stripe.paymentMethods.detach(paymentMethodId);
  await query(
    `DELETE FROM payment_methods WHERE stripe_payment_method_id = $1`,
    [paymentMethodId]
  );
}

export async function setDefaultPaymentMethod(
  userId: string,
  paymentMethodId: string
): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE payment_methods SET is_default = FALSE WHERE user_id = $1`,
      [userId]
    );
    await client.query(
      `UPDATE payment_methods SET is_default = TRUE
       WHERE user_id = $1 AND stripe_payment_method_id = $2`,
      [userId, paymentMethodId]
    );
  });
}

export async function createPaymentIntentForRide(
  customerId: string,
  amountCents: number,
  currency: string,
  rideId: string,
  paymentMethodId?: string
): Promise<Stripe.PaymentIntent> {
  const pi = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    customer: customerId,
    ...(paymentMethodId ? { payment_method: paymentMethodId } : {}),
    confirm: !!paymentMethodId,
    off_session: !!paymentMethodId,
    metadata: { rideId },
    description: `RideMe trip payment - ${rideId}`,
  });

  return pi;
}

export async function capturePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.capture(paymentIntentId);
}

export async function createDriverSubscription(
  driverId: string,
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.Subscription> {
  const { rows } = await query<{ stripe_subscription_id: string | null }>(
    `SELECT stripe_subscription_id FROM drivers WHERE id = $1`,
    [driverId]
  );

  if (rows.length === 0) throw new NotFoundError('Driver not found');
  if (rows[0].stripe_subscription_id) {
    throw new ConflictError('Driver already has an active subscription');
  }

  // Set default payment method on customer
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: env.STRIPE_MONTHLY_PRICE_ID }],
    default_payment_method: paymentMethodId,
    metadata: { driverId },
    expand: ['latest_invoice.payment_intent'],
  });

  // Update driver record
  await query(
    `UPDATE drivers
     SET stripe_subscription_id = $1,
         subscription_status = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [subscription.id, subscription.status, driverId]
  );

  logger.info('Driver subscription created', { driverId, subscriptionId: subscription.id });
  return subscription;
}

export async function cancelDriverSubscription(driverId: string): Promise<Stripe.Subscription> {
  const { rows } = await query<{ stripe_subscription_id: string | null }>(
    `SELECT stripe_subscription_id FROM drivers WHERE id = $1`,
    [driverId]
  );

  if (rows.length === 0) throw new NotFoundError('Driver not found');
  if (!rows[0].stripe_subscription_id) {
    throw new BadRequestError('No active subscription found');
  }

  const subscription = await stripe.subscriptions.update(
    rows[0].stripe_subscription_id,
    { cancel_at_period_end: true }
  );

  await query(
    `UPDATE drivers SET subscription_status = 'canceling', updated_at = NOW() WHERE id = $1`,
    [driverId]
  );

  logger.info('Driver subscription cancellation scheduled', { driverId });
  return subscription;
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export async function chargeDriverTripFee(
  driverStripeCustomerId: string,
  driverId: string,
  rideId: string
): Promise<Stripe.PaymentIntent> {
  // Get driver's default payment method
  const methods = await listPaymentMethods(driverStripeCustomerId);
  if (methods.length === 0) {
    throw new BadRequestError('Driver has no payment method on file');
  }

  const defaultMethod = methods[0];

  const pi = await stripe.paymentIntents.create({
    amount: env.DRIVER_TRIP_FEE_CENTS,
    currency: 'usd',
    customer: driverStripeCustomerId,
    payment_method: defaultMethod.id,
    confirm: true,
    off_session: true,
    metadata: { driverId, rideId, type: 'trip_fee' },
    description: `RideMe driver trip fee - ride ${rideId}`,
  });

  // Record trip fee intent on ride
  await query(
    `UPDATE rides SET trip_fee_intent_id = $1, updated_at = NOW() WHERE id = $2`,
    [pi.id, rideId]
  );

  logger.info('Driver trip fee charged', { driverId, rideId, amount: env.DRIVER_TRIP_FEE_CENTS });
  return pi;
}

export async function handleSubscriptionWebhook(
  subscription: Stripe.Subscription
): Promise<void> {
  const driverId = subscription.metadata.driverId;
  if (!driverId) {
    logger.warn('Subscription webhook missing driverId', { subId: subscription.id });
    return;
  }

  await query(
    `UPDATE drivers
     SET subscription_status = $1, updated_at = NOW()
     WHERE id = $2`,
    [subscription.status, driverId]
  );

  logger.info('Driver subscription status updated', { driverId, status: subscription.status });
}

export async function handlePaymentIntentWebhook(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const { rideId, type } = paymentIntent.metadata;

  if (type === 'trip_fee') {
    logger.info('Trip fee payment intent succeeded', { rideId });
    return;
  }

  if (rideId) {
    const status = paymentIntent.status === 'succeeded' ? 'paid' : 'failed';
    await query(
      `UPDATE rides SET payment_status = $1, updated_at = NOW() WHERE id = $2`,
      [status, rideId]
    );

    if (paymentIntent.status === 'succeeded') {
      // Record driver earnings
      const { rows } = await query<{
        driver_id: string;
        final_price: number;
      }>(
        `SELECT driver_id, final_price FROM rides WHERE id = $1`,
        [rideId]
      );

      if (rows.length > 0 && rows[0].driver_id) {
        const gross = rows[0].final_price;
        const fee = env.DRIVER_TRIP_FEE_CENTS / 100;
        const net = gross - fee;

        await query(
          `INSERT INTO driver_earnings (driver_id, ride_id, gross_amount, trip_fee, net_amount, paid_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT DO NOTHING`,
          [rows[0].driver_id, rideId, gross, fee, net]
        );
      }
    }
  }
}
