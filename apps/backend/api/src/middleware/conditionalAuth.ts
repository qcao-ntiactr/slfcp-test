// Conditional authentication middleware that bypasses auth in test mode
import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserType } from '@prisma/client';

import { isTestMode, authMode } from '../config.js';
import { sanitizeForLogs } from '../utils/sanitize.js';
import { logError } from '../utils/structuredLogger.js';

import { hybridAuth } from './hybridAuth.js';
import { Role } from './roles.js';

const prisma = new PrismaClient();

/**
 * Test authentication middleware that sets up a mock user
 * Retrieves user role from database based on email to ensure consistency
 * across environments
 */
async function testAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Extract user email to determine role and default user
    const userEmail = req.headers['x-user-email'] as string;

    // Determine user role and default external_id based on email
    let userRole: Role = UserType.COMMERCIAL;
    let defaultUserId = 'commercialqa@company.com'; // Default to a valid commercial user

    if (userEmail) {
      // Try to get user from database first for accurate role assignment
      const dbUser = await prisma.user.findUnique({
        where: { email: userEmail },
        include: { entity: true },
      });

      if (dbUser && dbUser.entity) {
        // Use role from database entity
        userRole = dbUser.entity.type as Role;
        defaultUserId = userEmail;
      } else {
        // Fallback to email-based heuristic if user not found in DB
        if (userEmail.includes('ntia') || userEmail.includes('NTIA')) {
          userRole = UserType.NTIA;
          defaultUserId = 'ntiadev@company.com';
        } else if (
          userEmail.includes('federal') ||
          userEmail.includes('FEDERAL')
        ) {
          userRole = UserType.FEDERAL_AGENCY;
          defaultUserId = 'federal@nasa.gov'; // Default to NASA user for federal agency
        }
      }
    }

    // Extract user ID from various test sources (prioritize test headers)
    // Use defaultUserId based on role if no specific user is provided
    const testUserId =
      (req.headers['x-test-user-id'] as string) ||
      (req.headers['x-user-id'] as string) ||
      req.body?.user_id ||
      req.query?.user_id ||
      defaultUserId;

    // Set up mock authenticated user
    req.user = {
      sub: testUserId,
      email: userEmail || testUserId,
      name: `Test User ${testUserId}`,
      role: userRole,
    };

    next();
  } catch (error) {
    // Log error but don't fail the request - fallback to email-based role assignment
    logError(
      'Error looking up user in database during mock auth:',
      error as Error,
      {
        operation: 'testAuthMiddleware',
        component: 'conditionalAuth_middleware',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      }
    );

    // Fallback: use simple email-based logic
    const userEmail = req.headers['x-user-email'] as string;
    let userRole: Role = UserType.COMMERCIAL;
    let defaultUserId = 'commercialqa@company.com';

    if (userEmail) {
      if (userEmail.includes('ntia') || userEmail.includes('NTIA')) {
        userRole = UserType.NTIA;
        defaultUserId = 'ntiadev@company.com';
      } else if (
        userEmail.includes('federal') ||
        userEmail.includes('FEDERAL')
      ) {
        userRole = UserType.FEDERAL_AGENCY;
        defaultUserId = 'federal@nasa.gov';
      }
    }

    const testUserId =
      (req.headers['x-test-user-id'] as string) ||
      (req.headers['x-user-id'] as string) ||
      req.body?.user_id ||
      req.query?.user_id ||
      defaultUserId;

    req.user = {
      sub: testUserId,
      email: userEmail || testUserId,
      name: `Test User ${testUserId}`,
      role: userRole,
    };

    next();
  }
}

/**
 * Conditional authentication middleware
 * Uses test auth in mock mode or test environment, real auth otherwise
 */
export async function conditionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (authMode === 'mock' || isTestMode) {
    return testAuthMiddleware(req, res, next);
  } else {
    return hybridAuth(req, res, next);
  }
}
