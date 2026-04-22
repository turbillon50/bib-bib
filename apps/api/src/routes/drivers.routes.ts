import { Router } from 'express';
import * as drivers from '../controllers/drivers.controller';
import { authenticate, requireDriver } from '../middleware/authenticate';

const router = Router();

router.post('/register', authenticate, drivers.registerDriver);
router.get('/me', authenticate, requireDriver, drivers.getDriverProfile);
router.put('/me', authenticate, requireDriver, drivers.updateDriverProfile);
router.put('/me/status', authenticate, requireDriver, drivers.toggleOnlineStatus);
router.put('/me/location', authenticate, requireDriver, drivers.updateLocation);
router.get('/me/earnings', authenticate, requireDriver, drivers.getEarnings);
router.get('/nearby', authenticate, drivers.getNearbyDrivers);

export default router;
