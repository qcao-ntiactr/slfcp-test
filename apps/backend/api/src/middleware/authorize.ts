import type { Response, NextFunction } from 'express';

import { logAuthEvent } from '../utils/structuredLogger.js';
import { accessMatrix } from '../access/accessMatrix.js';
import { sanitizeForLogs } from '../utils/sanitize.js';

import { Role } from './roles.js';

interface AuthenticatedRequest {
  method: string;
  path: string;
  user?: {
    sub: string;
    role: Role;
    email?: string;
    name?: string;
    method?: string;
    [key: string]: unknown;
  };
}

/**
 * Creates an authorization middleware for a specific route pattern
 * @param routePattern - The route pattern to authorize against
 * @returns Express middleware function that checks user authorization
 */
export const authorize = (routePattern: string) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void | Response => {
    const user = req.user;
    if (!user || !user.role) {
      logAuthEvent(
        'Authorization failed: missing user role',
        'authorization_failed',
        false,
        null,
        '',
        {
          route: sanitizeForLogs(routePattern),
          method: req.method,
        }
      );
      return res
        .status(401)
        .json({ message: 'Unauthorized: missing user role' });
    }

    const userRole = user.role;
    if (userRole === 'unknown') {
      logAuthEvent(
        'Authorization failed: unknown role',
        'authorization_failed',
        false,
        null,
        '',
        {
          route: sanitizeForLogs(routePattern),
          method: req.method,
          userRole: sanitizeForLogs(JSON.stringify(userRole)),
        }
      );
      return res.status(403).json({ message: 'Access denied: unknown role' });
    }

    const key = `${req.method} ${routePattern}` as keyof typeof accessMatrix;
    const actionRouteRoles = accessMatrix[key];

    if (!actionRouteRoles?.length) {
      logAuthEvent(
        'Authorization failed: no route config',
        'authorization_failed',
        false,
        null,
        '',
        {
          route: sanitizeForLogs(routePattern),
          method: req.method,
          accessKey: sanitizeForLogs(key),
        }
      );
      return res
        .status(403)
        .json({ message: 'Access denied (no route config)' });
    }

    const isUserAllowed = actionRouteRoles.includes(userRole);

    if (!isUserAllowed) {
      logAuthEvent(
        'Authorization failed: access denied for user role',
        'authorization_failed',
        false,
        null,
        '',
        {
          route: sanitizeForLogs(routePattern),
          method: req.method,
          userRole: sanitizeForLogs(`${user.role}`),
          allowedRoles: sanitizeForLogs(JSON.stringify(actionRouteRoles)),
        }
      );
      return res.status(403).json({ message: 'Access denied for user' });
    }

    next();
  };
};

/**
 * Helper function to convert actual path to route pattern
 * @param path - The actual request path
 * @returns The route pattern with parameters replaced
 */
const pathToRoutePattern = (path: string): string => {
  let pattern = path;

  // Remove trailing slash (except for root path)
  if (pattern.length > 1 && pattern.endsWith('/')) {
    pattern = pattern.slice(0, -1);
  }

  // Handle specific patterns in order of specificity (most specific first)

  // Handle dashboard timeframe parameters
  pattern = pattern.replace(
    /\/dashboard\/requests-over-time\/[^/]+/,
    '/dashboard/requests-over-time/:timeframe'
  );
  pattern = pattern.replace(
    /\/dashboard\/request-completion-time\/[^/]+/,
    '/dashboard/request-completion-time/:timeframe'
  );

  // Handle messages with messageId (must come before general :id replacement)
  pattern = pattern.replace(/\/messages\/-?\d+/, '/messages/:messageId');

  // Handle inquiries with nested IDs (must come before general :id replacement)
  pattern = pattern.replace(/\/inquiries\/-?\d+/, '/inquiries/:inquiryId');

  // Handle revisions with revisionId (must come before general :id replacement)
  pattern = pattern.replace(/\/revisions\/-?\d+/, '/revisions/:revisionId');

  // Handle users with email pattern
  pattern = pattern.replace(/\/users\/email\/[^/]+/, '/users/email/:email');

  // Handle users with externalId
  pattern = pattern.replace(/\/users\/[^/]+/, '/users/:externalId');

  // Convert remaining numeric IDs to :id parameter (general case, including negative numbers)
  pattern = pattern.replace(/\/-?\d+/g, '/:id');

  // Handle request-drafts with any ID format (including non-numeric like 'abc')
  pattern = pattern.replace(/\/request-drafts\/[^/]+/, '/request-drafts/:id');

  return pattern;
};

/**
 * General authorization middleware that auto-detects route pattern
 * @param req - Express request object with user information
 * @param res - Express response object
 * @param next - Express next function
 * @returns void or Response if authorization fails
 */
export const authorizeRequest = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void | Response => {
  const user = req.user;
  if (!user) {
    logAuthEvent(
      'Authorization failed: could not find user',
      'authorization_failed',
      false,
      null,
      '',
      {
        path: sanitizeForLogs(req.path),
        method: req.method,
      }
    );
    return res
      .status(401)
      .json({ message: 'Unauthorized: could not find user' });
  }

  if (!user.role) {
    logAuthEvent(
      'Authorization failed: missing user role',
      'authorization_failed',
      false,
      null,
      '',
      {
        path: sanitizeForLogs(req.path),
        method: req.method,
      }
    );
    return res.status(401).json({ message: 'Unauthorized: missing user role' });
  }

  const userRole = user.role;
  if (userRole === 'unknown') {
    logAuthEvent(
      'Authorization failed: unknown role',
      'authorization_failed',
      false,
      null,
      '',
      {
        path: sanitizeForLogs(req.path),
        method: req.method,
        userRole: sanitizeForLogs(JSON.stringify(userRole)),
      }
    );
    return res.status(403).json({ message: 'Access denied: unknown role' });
  }

  // Convert the actual path to a route pattern
  const routePattern = pathToRoutePattern(req.path);
  const key = `${req.method} ${routePattern}` as keyof typeof accessMatrix;
  const actionRouteRoles = accessMatrix[key];

  if (!actionRouteRoles?.length) {
    logAuthEvent(
      'Authorization failed: no route config',
      'authorization_failed',
      false,
      null,
      '',
      {
        path: sanitizeForLogs(req.path),
        method: req.method,
        routePattern: sanitizeForLogs(routePattern),
        accessKey: sanitizeForLogs(key),
      }
    );
    return res.status(403).json({ message: 'Access denied (no route config)' });
  }

  const isUserAllowed = actionRouteRoles.includes(userRole);

  if (!isUserAllowed) {
    logAuthEvent(
      'Authorization failed: access denied for user role',
      'authorization_failed',
      false,
      null,
      '',
      {
        path: sanitizeForLogs(req.path),
        method: req.method,
        routePattern: sanitizeForLogs(routePattern),
        userRole: sanitizeForLogs(`${user.role}`),
        allowedRoles: sanitizeForLogs(JSON.stringify(actionRouteRoles)),
      }
    );
    return res.status(403).json({ message: 'Access denied for user' });
  }

  next();
};
