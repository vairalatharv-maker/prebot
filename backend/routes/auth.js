import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, me, register } from '../controllers/authController.js';
import requireAuth from '../middleware/requireAuth.js';
import requireAuthConfig from '../middleware/requireAuthConfig.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many attempts. Please wait a little and try again.' } });
router.use(requireAuthConfig);
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', requireAuth, me);
export default router;
