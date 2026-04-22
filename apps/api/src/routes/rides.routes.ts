import { Router } from 'express';
import * as rides from '../controllers/rides.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.post('/', rides.createRide);
router.get('/', rides.listRides);
router.get('/active', rides.getActiveRide);
router.get('/fare-estimate', rides.getFareEstimate);
router.get('/:id', rides.getRide);
router.post('/:id/cancel', rides.cancelRide);
router.put('/:id/arrived', rides.markArrived);
router.put('/:id/start', rides.startRide);
router.put('/:id/complete', rides.completeRide);
router.post('/:id/rate', rides.rateRide);
router.get('/:id/route', rides.getRoute);

export default router;
