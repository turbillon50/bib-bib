import { Router } from 'express';
import * as payments from '../controllers/payments.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.post('/setup-intent', payments.createSetupIntent);
router.get('/methods', payments.listPaymentMethods);
router.post('/methods', payments.addPaymentMethod);
router.delete('/methods/:id', payments.removePaymentMethod);
router.put('/methods/:id/default', payments.setDefaultMethod);
router.get('/history', payments.getPaymentHistory);

export default router;
