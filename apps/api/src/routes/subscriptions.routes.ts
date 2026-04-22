import { Router } from 'express';
import * as subs from '../controllers/subscriptions.controller';
import { authenticate, requireDriver } from '../middleware/authenticate';

const router = Router();

router.get('/plans', subs.getPlans);
router.use(authenticate, requireDriver);
router.get('/me', subs.getMySubscription);
router.post('/', subs.createSubscription);
router.put('/me/cancel', subs.cancelSubscription);
router.put('/me/reactivate', subs.reactivateSubscription);
router.post('/portal', subs.createBillingPortal);

export default router;
