import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { verifyEmail } from '../controllers/verifyEmail.js';

const verifyEmailRouter: express.Router = Router();

/**
 * Rate limiter middleware to protect against DoS attacks on email verification.
 * Allows max 5 requests per IP every 15 minutes.
 */
const verifyEmailRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    status: 429,
    error:
      'Too many verification attempts from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Note: express-rate-limit automatically respects Express's app.set('trust proxy') setting
});

/**
 * Route to verify an email using a token.
 * @route GET /verify-email?token=abc123
 */
verifyEmailRouter.get('/verify-email', verifyEmailRateLimiter, verifyEmail);

export default verifyEmailRouter;
