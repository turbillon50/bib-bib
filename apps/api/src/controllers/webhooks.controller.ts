import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe } from '../config/stripe';
import { env } from '../config/env';
import { query } from '../config/database';
import { sendPushToUser } from '../services/notification.service';
import { logger } from '../utils/logger';

export async function stripeWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.warn('Stripe webhook signature verification failed');
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  try {
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await query(
          `UPDATE subscriptions SET status=$1, current_period_end=to_timestamp($2),
           cancel_at_period_end=$3, updated_at=NOW()
           WHERE stripe_subscription_id=$4`,
          [sub.status, sub.current_period_end, sub.cancel_at_period_end, sub.id]
        );
        await query(
          `UPDATE drivers SET subscription_status=$1, subscription_period_end=to_timestamp($2), updated_at=NOW()
           WHERE stripe_subscription_id=$3`,
          [sub.status, sub.current_period_end, sub.id]
        );

        // Notify driver
        const { rows: [driver] } = await query(
          `SELECT user_id FROM drivers WHERE stripe_subscription_id=$1`, [sub.id]
        );
        if (driver && sub.status === 'past_due') {
          sendPushToUser(driver.user_id, {
            title: 'Pago de suscripción fallido',
            body: 'Actualiza tu método de pago para seguir usando Bib-Bib',
            data: { type: 'subscription_past_due' },
          }).catch(() => {});
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await query(
            `UPDATE drivers SET subscription_status='active', updated_at=NOW()
             WHERE stripe_subscription_id=$1`,
            [invoice.subscription]
          );
          await query(
            `UPDATE subscriptions SET status='active', updated_at=NOW()
             WHERE stripe_subscription_id=$1`,
            [invoice.subscription]
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await query(
            `UPDATE drivers SET subscription_status='past_due', updated_at=NOW()
             WHERE stripe_subscription_id=$1`,
            [invoice.subscription]
          );
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await query(
          `UPDATE payments SET status='succeeded', stripe_charge_id=$1, updated_at=NOW()
           WHERE stripe_payment_intent_id=$2`,
          [pi.latest_charge as string, pi.id]
        );
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await query(
          `UPDATE payments SET status='failed', failure_reason=$1, updated_at=NOW()
           WHERE stripe_payment_intent_id=$2`,
          [pi.last_payment_error?.message ?? 'Unknown', pi.id]
        );
        break;
      }

      default:
        logger.debug(`Unhandled Stripe event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    logger.error('Webhook processing error', { event: event.type, err });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
