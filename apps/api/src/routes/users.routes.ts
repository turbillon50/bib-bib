import { Router } from 'express';
import * as users from '../controllers/users.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/me', users.getMe);
router.put('/me', users.updateMe);
router.put('/me/fcm-token', users.updateFcmToken);
router.get('/me/trips', users.getRideHistory);

export default router;
