import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/register', auth.register);
router.post('/login', auth.login);
router.post('/refresh', auth.refresh);
router.post('/logout', authenticate, auth.logoutHandler);
router.post('/otp/send', auth.sendOtp);
router.post('/otp/verify', auth.verifyOtp);

export default router;
