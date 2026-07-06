// Hybrid authentication middleware that supports both mock and Entra ID authentication
// This allows gradual migration without disrupting existing functionality

import { Request, Response, NextFunction } from 'express';

import { logError, logWithOperation } from '../utils/structuredLogger.js';
import { authMode, isTestMode } from '../config.js';
import { JwtService } from '../services/jwtService.js';
import { sanitizeForLogs } from '../utils/sanitize.js';

import { Role } from './roles.js';

interface DecodedUser {
  sub: string;
  email?: string;
  name?: string;
  role: Role;
  [key: string]: unknown;
}

/**
 * Hybrid authentication middleware that supports both mock and Entra ID authentication
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @returns void, Response, or Promise of void/Response
 */
export function hybridAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void | Response | Promise<void | Response> {
  const authHeader = req.headers.authorization;

  // In mock mode, only allow bypass in test environments with proper safeguards
  if (authMode === 'mock') {
    // Only allow user-controlled bypass in test environment
    if (isTestMode) {
      const testUserId =
        (req.headers['x-test-user-id'] as string) ||
        (req.headers['x-user-id'] as string) ||
        req.body?.user_id ||
        req.query?.user_id;

      if (testUserId) {
        return handleMockAuth(req, res, next, ''); // Pass empty token since we don't need it
      }
    }
  }

  if (!authHeader?.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  // Determine authentication method based on configuration
  switch (authMode) {
    case 'mock':
      return handleMockAuth(req, res, next, token);

    case 'entra':
      return handleEntraAuth(req, res, next, token);

    case 'login-gov':
      return handleLoginGovAuth(req, res, next, token);

    case 'hybrid':
      return handleHybridAuth(req, res, next, token);

    default:
      // Fallback to JWT validation
      try {
        const decoded = JwtService.verifyToken(token);
        const user: DecodedUser = {
          sub: decoded.sub,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role,
        };
        req.user = user;
        return next();
      } catch (error) {
        // Structured log to avoid log injection; keep message constant and put values in fields.
        logError(
          'JWT token validation failed in default auth mode',
          error as Error,
          {
            operation: 'hybridAuth',
            component: 'hybridAuth_middleware',
            additionalData: {
              error: sanitizeForLogs(String(error)),
            },
          }
        );
        return res
          .status(401)
          .json({ message: 'Invalid or unauthorized token' });
      }
  }
}

/**
 * Handles mock authentication for testing purposes
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @param token - JWT token (may be unused in mock mode)
 * @returns void or Response
 */
function handleMockAuth(
  req: Request,
  res: Response,
  next: NextFunction,
  token: string
): void | Response {
  // Only allow user-controlled bypass in test environment
  if (isTestMode) {
    // Check if we can extract user ID from various sources (like test mode)
    const testUserId =
      (req.headers['x-test-user-id'] as string) ||
      (req.headers['x-user-id'] as string) ||
      req.body?.user_id ||
      req.query?.user_id;

    if (testUserId) {
      // Set up mock authenticated user without JWT verification
      req.user = {
        sub: testUserId,
        email: `${testUserId}@test.com`,
        name: `Test User ${testUserId}`,
        role: 'COMMERCIAL',
      };
      return next();
    }
  }

  // Fallback to JWT verification if no user ID provided via headers/body/query
  try {
    const decoded = JwtService.verifyToken(token);
    const user: DecodedUser = {
      sub: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };
    req.user = user;
    next();
  } catch (error) {
    // Structured log to avoid log injection; keep message constant and put values in fields.
    logError(
      'JWT token validation failed in mock auth fallback',
      error as Error,
      {
        operation: 'hybridAuth',
        component: 'hybridAuth_middleware',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      }
    );
    return res.status(401).json({ message: 'Invalid or unauthorized token' });
  }
}

/**
 * Handles Entra ID authentication
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @param token - JWT token to validate
 * @returns Promise of void or Response
 */
async function handleEntraAuth(
  req: Request,
  res: Response,
  next: NextFunction,
  token: string
): Promise<void | Response> {
  try {
    // Validate our own JWT token
    const decoded = JwtService.verifyToken(token);

    const user: DecodedUser = {
      sub: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };

    req.user = user;
    next();
  } catch (error) {
    // Structured log to avoid log injection; keep message constant and put values in fields.
    logError('JWT token validation failed in Entra auth', error as Error, {
      operation: 'hybridAuth',
      component: 'hybridAuth_middleware',
      additionalData: {
        error: sanitizeForLogs(String(error)),
      },
    });
    return res.status(401).json({ message: 'Invalid or unauthorized token' });
  }
}

/**
 * Handles Login.gov authentication
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @param token - JWT token to validate
 * @returns Promise of void or Response
 */
async function handleLoginGovAuth(
  req: Request,
  res: Response,
  next: NextFunction,
  token: string
): Promise<void | Response> {
  try {
    // Validate our own JWT token
    const decoded = JwtService.verifyToken(token);

    const user: DecodedUser = {
      sub: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };

    req.user = user;
    next();
  } catch (error) {
    // Structured log to avoid log injection; keep message constant and put values in fields.
    logError('JWT token validation failed in Login.gov auth', error as Error, {
      operation: 'hybridAuth',
      component: 'hybridAuth_middleware',
      additionalData: {
        error: sanitizeForLogs(String(error)),
      },
    });
    return res.status(401).json({ message: 'Invalid or unauthorized token' });
  }
}

/**
 * Handles hybrid authentication (tries JWT first, falls back to mock)
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @param token - JWT token to validate
 * @returns Promise of void or Response
 */
async function handleHybridAuth(
  req: Request,
  res: Response,
  next: NextFunction,
  token: string
): Promise<void | Response> {
  // Try JWT validation first, fallback to mock
  try {
    const decoded = JwtService.verifyToken(token);

    const user: DecodedUser = {
      sub: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };

    req.user = user;
    return next();
  } catch {
    logWithOperation(
      'info',
      'JWT validation failed, trying mock auth fallback'
    );
    // Continue to mock auth fallback
  }

  // Fallback to mock authentication
  return handleMockAuth(req, res, next, token);
}
