import { Request, Response, NextFunction } from 'express';

import prisma from '../utils/database.js';
import { logError, logAuthEvent } from '../utils/structuredLogger.js';
import { sanitizeForLogs } from '../utils/sanitize.js';

import { Role } from './roles.js';

interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email?: string;
    name?: string;
    role: Role;
    [key: string]: unknown;
  };
}

export async function checkUserActive(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  const user = req.user;

  if (!user || !user.sub) {
    logAuthEvent(
      'User active check failed: missing user information',
      'user_active_check_failed',
      false,
      null,
      '',
      {
        userSub: user?.sub || 'unknown',
      }
    );
    return res
      .status(401)
      .json({ message: 'Unauthorized: missing user information' });
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { external_id: user.sub },
      select: {
        active: true,
        email: true,
        entity: {
          select: {
            active: true,
          },
        },
      },
    });

    if (!dbUser) {
      logAuthEvent(
        'User active check failed: user not found in database',
        'user_active_check_failed',
        false,
        null,
        user.sub,
        {
          userEmail: sanitizeForLogs(user.email || 'unknown'),
        }
      );
      return res.status(401).json({ message: 'Unauthorized: user not found' });
    }

    if (!dbUser.active) {
      logAuthEvent(
        'User active check failed: user is not active',
        'user_active_check_failed',
        false,
        null,
        user.sub,
        {
          userEmail: sanitizeForLogs(dbUser.email || 'unknown'),
        }
      );
      return res
        .status(403)
        .json({ message: 'Access denied: user account is inactive' });
    }

    if (
      !dbUser.entity?.active &&
      user.role === 'FEDERAL_AGENCY' &&
      ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)
    ) {
      logAuthEvent(
        'User active check failed: entity is not active',
        'user_active_check_failed',
        false,
        null,
        user.sub,
        {
          userEmail: sanitizeForLogs(dbUser.email || 'unknown'),
          method: req.method,
          role: user.role,
        }
      );
      return res
        .status(403)
        .json({ message: 'Access denied: entity is inactive' });
    }

    next();
  } catch (error) {
    logError('Error checking user active status', error as Error, {
      operation: 'checkUserActive',
      component: 'checkUserActive_middleware',
      additionalData: {
        userSub: sanitizeForLogs(user.sub),
        userEmail: sanitizeForLogs(user.email || 'unknown'),
        error: sanitizeForLogs(String(error)),
      },
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}
