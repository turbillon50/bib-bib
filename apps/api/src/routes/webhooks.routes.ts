import { Router } from 'express';
import * as webhooks from '../controllers/webhooks.controller';

const router = Router();

// raw body already set in app.ts for this path
router.post('/stripe', webhooks.stripeWebhook);

export default router;
