import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { stripe } from '../config/stripe';
import { success } from '../utils/response';
import { NotFoundError } from '../utils/errors';

export async function createSetupIntent(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows: [user] } = await query(
      `SELECT stripe_customer_id FROM users WHERE id=$1`, [req.user!.id]
    );
    let customerId = user?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { userId: req.user!.id } });
      customerId = customer.id;
      await query(`UPDATE users SET stripe_customer_id=$1 WHERE id=$2`, [customerId, req.user!.id]);
    }
    const intent = await stripe.setupIntents.create({ customer: customerId, usage: 'off_session' });
    res.json(success({ clientSecret: intent.client_secret }));
  } catch (err) { next(err); }
}

export async function listPaymentMethods(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows } = await query(
      `SELECT * FROM payment_methods WHERE user_id=$1 ORDER BY is_default DESC, created_at DESC`,
      [req.user!.id]
    );
    res.json(success(rows));
  } catch (err) { next(err); }
}

export async function addPaymentMethod(req: Request, res: Response, next: NextFunction) {
  try {
    const { stripePaymentMethodId } = req.body as { stripePaymentMethodId: string };
    const { rows: [user] } = await query(
      `SELECT stripe_customer_id FROM users WHERE id=$1`, [req.user!.id]
    );
    const pm = await stripe.paymentMethods.retrieve(stripePaymentMethodId);
    await stripe.paymentMethods.attach(stripePaymentMethodId, { customer: user.stripe_customer_id });

    // Count existing methods to decide default
    const { rows: existing } = await query(
      `SELECT id FROM payment_methods WHERE user_id=$1`, [req.user!.id]
    );
    const isDefault = existing.length === 0;

    const { rows: [saved] } = await query(
      `INSERT INTO payment_methods (user_id, stripe_payment_method_id, card_brand, card_last4, card_exp_month, card_exp_year, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user!.id, stripePaymentMethodId,
       pm.card?.brand, pm.card?.last4, pm.card?.exp_month, pm.card?.exp_year, isDefault]
    );
    res.json(success(saved));
  } catch (err) { next(err); }
}

export async function removePaymentMethod(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows: [pm] } = await query(
      `SELECT * FROM payment_methods WHERE id=$1 AND user_id=$2`, [req.params.id, req.user!.id]
    );
    if (!pm) throw new NotFoundError('Payment method not found');
    await stripe.paymentMethods.detach(pm.stripe_payment_method_id);
    await query(`DELETE FROM payment_methods WHERE id=$1`, [req.params.id]);
    res.json(success({ removed: true }));
  } catch (err) { next(err); }
}

export async function setDefaultMethod(req: Request, res: Response, next: NextFunction) {
  try {
    await query(`UPDATE payment_methods SET is_default=false WHERE user_id=$1`, [req.user!.id]);
    await query(
      `UPDATE payment_methods SET is_default=true WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.user!.id]
    );
    res.json(success({ updated: true }));
  } catch (err) { next(err); }
}

export async function getPaymentHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows } = await query(
      `SELECT p.*, r.origin_address, r.destination_address
       FROM payments p
       LEFT JOIN rides r ON r.id = p.ride_id
       WHERE p.user_id=$1
       ORDER BY p.created_at DESC LIMIT 50`,
      [req.user!.id]
    );
    res.json(success(rows));
  } catch (err) { next(err); }
}
