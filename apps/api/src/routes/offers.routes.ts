import { Router } from 'express';
import * as offers from '../controllers/offers.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.post('/', offers.createOffer);
router.put('/:id/accept', offers.acceptOffer);
router.put('/:id/reject', offers.rejectOffer);
router.put('/:id/withdraw', offers.withdrawOffer);
router.get('/ride/:rideId', offers.getOffersForRide);

export default router;
