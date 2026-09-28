import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { chat } from '../controllers/chatController.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'You have sent several messages in a short time. Please wait a moment.' },
});

router.post('/', requireAuth, chatLimiter, chat);
export default router;
