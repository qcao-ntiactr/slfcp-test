// Utility for extracting and validating user information from authenticated requests
// This replaces the need to trust user_id from various request sources

import { Request } from 'express';

import { UsersService } from '../services/users.js';

export interface AuthenticatedUser {
  id: number; // Internal database ID
  external_id: string; // External ID (mock or Entra)
  name: string;
  email: string;
  entity: unknown; // Changed from 'any' to 'unknown'
  can_concur: boolean;
}

/**
 * Extracts the authenticated user's external ID from the JWT token
 * and validates that the user exists in the database.
 *
 * This replaces the pattern of trusting user_id from:
 * - req.body.user_id
 * - req.query.user_id
 * - req.headers['x-user-id']
 *
 * @param req - Express request object with authenticated user
 * @returns Promise<AuthenticatedUser> - Validated user from database
 * @throws Error if user not found or not authenticated
 */
export async function getAuthenticatedUser(
  req: Request
): Promise<AuthenticatedUser> {
  // Ensure user is authenticated
  if (!req.user || !req.user.sub) {
    throw new Error('User not authenticated');
  }

  const userExternalId = req.user.sub;
  const usersService = new UsersService();

  // Get user from database using external ID from token
  const user = await usersService.getUserByExternalId(userExternalId);

  if (!user) {
    throw new Error(
      `User with external ID ${userExternalId} not found in system. Please contact your administrator.`
    );
  }

  return user;
}

/**
 * Extracts user external ID from the authenticated token and overrides
 * any user_id values in the request to prevent spoofing.
 *
 * This is a transitional helper that maintains backward compatibility
 * while securing user identification.
 *
 * @param req - Express request object
 * @returns string - User's external ID from token
 */
export function extractAndOverrideUserId(req: Request): string {
  if (!req.user || !req.user.sub) {
    throw new Error('User not authenticated');
  }

  const authenticatedUserId = req.user.sub;

  // Override any user_id in request to prevent spoofing
  if (req.body && typeof req.body === 'object') {
    req.body.user_id = authenticatedUserId;
  }

  // Also set in headers for backward compatibility with draft routes
  if (req.headers) {
    req.headers['x-user-id'] = authenticatedUserId;
  }

  return authenticatedUserId;
}

/**
 * Legacy helper for routes that need user_id from various sources
 * but now extracts it securely from the authenticated token.
 *
 * @param req - Express request object
 * @returns string - User's external ID from token
 */
export function getUserExternalId(req: Request): string {
  return extractAndOverrideUserId(req);
}
