import rateLimit from 'express-rate-limit';

import {
  authRateLimiterWindowMs,
  authRateLimiterMax,
  strictAuthRateLimiterWindowMs,
  strictAuthRateLimiterMax,
  refreshTokenRateLimiterWindowMs,
  refreshTokenRateLimiterMax,
  generalRateLimiterWindowMs,
  generalRateLimiterMax,
} from '../config.js';
import { logBusinessEvent } from '../utils/structuredLogger.js';

/**
 * Custom key generator for rate limiter that handles Azure App Service proxy format
 * Extracts just the IP address, stripping any port number
 */
function keyGenerator(req) {
  // Get the IP address, which should be correctly extracted by Express's trust proxy
  let ip = req.ip || 'unknown';

  // Strip port number if present (Azure might include :port in the IP)
  if (typeof ip === 'string' && ip.includes(':')) {
    ip = ip.split(':')[0];
  }

  return ip;
}

/**
 * Rate limiter for authentication endpoints
 * Prevents brute force attacks by limiting the number of requests
 */
export const authRateLimiter = rateLimit({
  windowMs: authRateLimiterWindowMs,
  max: authRateLimiterMax,
  message: {
    error: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGenerator,
  handler: (req, res) => {
    logBusinessEvent(
      'Rate limit exceeded for authentication endpoint',
      'warn',
      'server',
      'authRateLimiter',
      {
        ip: req.ip,
        path: req.path,
        method: req.method,
      }
    );
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later',
    });
  },
});

/**
 * Stricter rate limiter for sensitive operations like logout
 */
export const strictAuthRateLimiter = rateLimit({
  windowMs: strictAuthRateLimiterWindowMs,
  max: strictAuthRateLimiterMax,
  message: {
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGenerator,
  handler: (req, res) => {
    logBusinessEvent(
      'Rate limit exceeded for auth operation',
      'warn',
      'server',
      'strictAuthRateLimiter',
      {
        ip: req.ip,
        path: req.path,
        method: req.method,
      }
    );
    res.status(429).json({
      error: 'Too many requests, please try again later',
    });
  },
});

/**
 * Rate limiter specifically for token refresh endpoint
 * Much more permissive than authRateLimiter since:
 * - Requires valid refresh token (already authenticated)
 * - Not a brute force vector
 * - Frontend needs to refresh tokens frequently during session
 */
export const refreshTokenRateLimiter = rateLimit({
  windowMs: refreshTokenRateLimiterWindowMs,
  max: refreshTokenRateLimiterMax,
  message: {
    error: 'Too many token refresh attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGenerator,
  handler: (req, res) => {
    logBusinessEvent(
      'Rate limit exceeded for token refresh endpoint',
      'warn',
      'server',
      'strictAuthRateLimiter',
      {
        ip: req.ip,
        path: req.path,
        method: req.method,
      }
    );
    res.status(429).json({
      error: 'Too many token refresh attempts, please try again later',
    });
  },
});

/**
 * General API rate limiter
 */
export const generalRateLimiter = rateLimit({
  windowMs: generalRateLimiterWindowMs,
  max: generalRateLimiterMax,
  message: {
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGenerator,
});
