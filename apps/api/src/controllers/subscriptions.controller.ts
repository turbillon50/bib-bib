import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { stripe } from '../config/stripe';
import { env } from '../config/env';
import { success } from '../utils/response';
import { NotFoundError, BadRequestError } from '../utils/errors';

export async function getPlans(_req: Request, res: Response, next: NextFunction) {
  try {
    const price = await stripe.prices.retrieve(env.STRIPE_MONTHLY_PRICE_ID, {
      expand: ['product'],
    });
    res.json(success([{
      id: price.id,
      name: (price.product as { name?: string })?.name ?? 'Plan Mensual Bib-Bib',
      amount: (price.unit_amount ?? 0) / 100,
      currency: price.currency.toUpperCase(),
      interval: price.recurring?.interval,
      tripFeeAmount: env.STRIPE_PER_TRIP_AMOUNT / 100,
      features: [
        'Acceso ilimitado a solicitudes de viaje',
        'Soporte prioritario 24/7',
        'Pagos seguros y automáticos',
        `Fee por viaje: $${(env.STRIPE_PER_TRIP_AMOUNT / 100).toFixed(2)}`,
      ],
      stripePriceId: price.id,
    }]));
  } catch (err) { next(err); }
}

export async function getMySubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows: [driver] } = await query(
      `SELECT d.*, s.* FROM drivers d
       LEFT JOIN subscriptions s ON s.driver_id = d.id
       WHERE d.user_id=$1 ORDER BY s.created_at DESC LIMIT 1`,
      [req.user!.id]
    );
    if (!driver) throw new NotFoundError('Driver not found');
    res.json(success(driver));
  } catch (err) { next(err); }
}

export async function createSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const { stripePaymentMethodId } = req.body as { stripePaymentMethodId: string };

    const { rows: [driver] } = await query(
      `SELECT d.*, u.email, u.first_name, u.last_name, u.stripe_customer_id
       FROM drivers d JOIN users u ON u.id=d.user_id WHERE d.user_id=$1`,
      [req.user!.id]
    );
    if (!driver) throw new NotFoundError('Driver not found');

    // Create or reuse Stripe customer
    let customerId = driver.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: driver.email,
        name: `${driver.first_name} ${driver.last_name}`,
        metadata: { userId: req.user!.id, driverId: driver.id },
      });
      customerId = customer.id;
      await query(`UPDATE users SET stripe_customer_id=$1 WHERE id=$2`, [customerId, req.user!.id]);
    }

    // Attach payment method
    await stripe.paymentMethods.attach(stripePaymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: stripePaymentMethodId },
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: env.STRIPE_MONTHLY_PRICE_ID }],
      default_payment_method: stripePaymentMethodId,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    const invoice = subscription.latest_invoice as { payment_intent?: { client_secret?: string } };
    const clientSecret = invoice?.payment_intent?.client_secret;

    // Save to DB
    await query(
      `INSERT INTO subscriptions (driver_id, stripe_subscription_id, stripe_customer_id, stripe_price_id,
         status, current_period_start, current_period_end, monthly_amount, currency)
       VALUES ($1,$2,$3,$4,$5,to_timestamp($6),to_timestamp($7),$8,$9)
       ON CONFLICT (stripe_subscription_id) DO NOTHING`,
      [driver.id, subscription.id, customerId, env.STRIPE_MONTHLY_PRICE_ID,
       subscription.status, subscription.current_period_start, subscription.current_period_end,
       (await stripe.prices.retrieve(env.STRIPE_MONTHLY_PRICE_ID)).unit_amount! / 100,
       subscription.currency]
    );

    await query(
      `UPDATE drivers SET stripe_subscription_id=$1, stripe_customer_id=$2, subscription_status=$3 WHERE id=$4`,
      [subscription.id, customerId, subscription.status, driver.id]
    );

    res.json(success({ subscriptionId: subscription.id, clientSecret, status: subscription.status }));
  } catch (err) { next(err); }
}

export async function cancelSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows: [driver] } = await query(
      `SELECT * FROM drivers WHERE user_id=$1`, [req.user!.id]
    );
    if (!driver?.stripe_subscription_id) throw new BadRequestError('No active subscription');

    await stripe.subscriptions.update(driver.stripe_subscription_id, { cancel_at_period_end: true });
    await query(
      `UPDATE subscriptions SET cancel_at_period_end=true WHERE stripe_subscription_id=$1`,
      [driver.stripe_subscription_id]
    );
    res.json(success({ cancelAtPeriodEnd: true }));
  } catch (err) { next(err); }
}

export async function reactivateSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows: [driver] } = await query(
      `SELECT * FROM drivers WHERE user_id=$1`, [req.user!.id]
    );
    if (!driver?.stripe_subscription_id) throw new BadRequestError('No subscription found');

    await stripe.subscriptions.update(driver.stripe_subscription_id, { cancel_at_period_end: false });
    await query(
      `UPDATE subscriptions SET cancel_at_period_end=false WHERE stripe_subscription_id=$1`,
      [driver.stripe_subscription_id]
    );
    res.json(success({ reactivated: true }));
  } catch (err) { next(err); }
}

export async function createBillingPortal(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows: [user] } = await query(
      `SELECT stripe_customer_id FROM users WHERE id=$1`, [req.user!.id]
    );
    if (!user?.stripe_customer_id) throw new BadRequestError('No billing account found');

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL}/driver/subscription`,
    });
    res.json(success({ url: session.url }));
  } catch (err) { next(err); }
}
