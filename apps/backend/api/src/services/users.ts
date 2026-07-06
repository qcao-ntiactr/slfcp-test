import { User, Entity } from '@prisma/client';

import prisma from '../utils/database.js';
import { sanitizeForLogs } from '../utils/sanitize.js';
import { logError, logBusinessEvent } from '../utils/structuredLogger.js';

export class UsersService {
  /**
   * Get a user by their external ID
   * @param externalId - User's external ID (e.g. from auth provider)
   * @returns User or null
   */
  async getUserByExternalId(
    externalId: string
  ): Promise<(User & { entity: Entity }) | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { external_id: externalId },
        include: {
          entity: true,
        },
      });

      if (!user) {
        logBusinessEvent('User not found', 'user_lookup', 'user', externalId);
        return null;
      }

      logBusinessEvent(
        'Retrieved user by external_id',
        'user_lookup',
        'user',
        externalId
      );
      return user;
    } catch (error) {
      logError('Error retrieving user by external_id', error, {
        operation: 'getUserByExternalId',
        component: 'users_services',
        additionalData: {
          externalId: sanitizeForLogs(externalId),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  /**
   * Get a user's external ID by their internal database ID
   * @param userId - User's internal database ID
   * @returns User's external ID or null if not found
   */
  async getUserExternalId(userId: number): Promise<string | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { external_id: true },
      });

      if (!user) {
        logBusinessEvent(
          'User not found',
          'user_lookup',
          'user',
          userId.toString()
        );
        return null;
      }

      logBusinessEvent(
        'Retrieved external_id by userId',
        'user_lookup',
        'user',
        userId.toString()
      );
      return user.external_id;
    } catch (error) {
      logError('Error retrieving external_id for user', error, {
        operation: 'getUserExternalId',
        component: 'users_services',
        additionalData: {
          userId: sanitizeForLogs(userId.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  /**
   * Get a user by their internal database ID
   * @param userId - User's internal database ID
   * @returns User with entity or null
   */
  async getUserById(
    userId: number
  ): Promise<(User & { entity: Entity }) | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          entity: true,
        },
      });

      if (!user) {
        logBusinessEvent(
          'User not found',
          'user_lookup',
          'user',
          userId.toString()
        );
        return null;
      }

      logBusinessEvent(
        'Retrieved user by ID',
        'user_lookup',
        'user',
        userId.toString()
      );
      return user;
    } catch (error) {
      logError('Error retrieving user by id', error, {
        operation: 'getUserById',
        component: 'users_services',
        additionalData: {
          userId: sanitizeForLogs(userId.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  /**
   * Get a user by their email address
   * @param email - User's email address
   * @returns User with entity or null if not found
   */
  async getUserByEmail(
    email: string
  ): Promise<(User & { entity: Entity }) | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email },
        include: {
          entity: true,
        },
      });

      if (!user) {
        logBusinessEvent('User not found', 'user_lookup', 'user', email);
        return null;
      }

      logBusinessEvent('Retrieved user by email', 'user_lookup', 'user', email);
      return user;
    } catch (error) {
      logError('Error retrieving user by email', error, {
        operation: 'getUserByEmail',
        component: 'users_services',
        additionalData: {
          email: sanitizeForLogs(email),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  /**
   * Get all users for a specific entity
   * @param entityId - Entity ID
   * @returns Array of users for the entity
   */
  async getUsersByEntityId(entityId: number): Promise<User[]> {
    try {
      const users = await prisma.user.findMany({
        where: { entity_id: entityId },
      });

      logBusinessEvent(
        'Retrieved users for entity',
        'user_list',
        'entity',
        entityId.toString(),
        { userCount: users.length }
      );

      return users;
    } catch (error) {
      logError('Error retrieving users for entity', error, {
        operation: 'getUsersByEntityId',
        component: 'users_services',
        additionalData: {
          entityId: sanitizeForLogs(entityId.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }
}
