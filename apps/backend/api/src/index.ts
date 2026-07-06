import express from 'express';
import rateLimit from 'express-rate-limit';

import requestRouters from './routers/requests.js';
import verifyEmailRouters from './routers/verifyEmail.js';
import requestDraftRouters from './routers/requestDrafts.js';
import usersRouters from './routers/users.js';
import authRouters from './routers/auth.js';
import dashboardRouters from './routers/dashboard.js';
import commonConditionsRouters from './routers/commonConditions.js';
import { conditionalAuth } from './middleware/conditionalAuth.js';
import { authorizeRequest } from './middleware/authorize.js';
import { checkUserActive } from './middleware/checkUserActive.js';
import { maintenanceMode } from './middleware/maintenanceMode.js';
import { sanitizeForLogs } from './utils/sanitize.js';
import { logBusinessEvent, logError } from './utils/structuredLogger.js';

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Note: express-rate-limit automatically respects Express's app.set('trust proxy') setting
});

export const routers: express.Router = express.Router();

/**
 * Health check endpoint to verify server is running
 * @param req - Express request object
 * @param res - Express response object
 */
routers.use('/healthcheck', (req, res) => {
  res.status(200).send('ok');
});

// Maintenance mode check
routers.use(maintenanceMode);

// Debug middleware to log all requests
routers.use((req, res, next) => {
  logBusinessEvent('Incoming request', 'info', 'server', '', {
    method: req.method,
    path: req.path,
    url: sanitizeForLogs(req.originalUrl),
  });
  next();
});

// Add auth routes (new, non-disruptive)
routers.use('/auth', authRouters);
routers.use(verifyEmailRouters);

// Apply rate limiting to authenticated routes
routers.use(limiter);

// Everything after this point requires authentication
routers.use(conditionalAuth);

// Check if user is active
routers.use(checkUserActive);

// Apply authorization based on user roles and access matrix
routers.use(authorizeRequest);

// Existing routes (unchanged)
routers.use(requestRouters);
routers.use(requestDraftRouters);
routers.use(usersRouters);
routers.use(dashboardRouters);
routers.use(commonConditionsRouters);

/**
 * 404 handler for routes that don't exist
 * @param req - Express request object
 * @param res - Express response object
 */
routers.use((req, res) => {
  logBusinessEvent('Route not found', 'warn', 'server', '', {
    method: req.method,
    path: sanitizeForLogs(req.path),
    userAgent: sanitizeForLogs(req.get('User-Agent') || ''),
  });
  const error = new Error("Sorry can't find that!");
  res.status(404).json({
    message: error.message,
  });
});

/**
 * Global error handler for unhandled errors
 * @param err - Error object
 * @param req - Express request object
 * @param res - Express response object
 * @param _next - Express next function (unused)
 */
// Global error handler
routers.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logError(
      'Unhandled error in request',
      err as Error,
      {
        additionalData: {
          method: req.method,
          path: sanitizeForLogs(req.path),
          error: sanitizeForLogs(String(err)),
          stack: sanitizeForLogs(err.stack || ''),
        },
      },
      req
    );
    res.status(500).json({
      message: 'Internal server error',
    });
  }
);

export default routers;
