import { Entity, UserType } from '@prisma/client';

import { logError, logWithOperation } from '../utils/structuredLogger.js';
import prisma from '../utils/database.js';
import { sanitizeForLogs } from '../utils/sanitize.js';

export const EntityEnum = UserType;

export class EntityService {
  /**
   * Get all entities
   * @returns {Promise<Entity[]>}
   */
  async getEntities(): Promise<Entity[]> {
    try {
      return await prisma.entity.findMany({
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      logError('Error fetching entities', error as Error, {
        operation: 'getEntities',
        component: 'entities_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching entities');
    }
  }

  /**
   * Get all active entities
   * @returns {Promise<Entity[]>}
   */
  async getActiveEntities(): Promise<Entity[]> {
    try {
      return await prisma.entity.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      logError('Error fetching active entities', error as Error, {
        operation: 'getActiveEntities',
        component: 'entities_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching active entities');
    }
  }

  /**
   * Get all active federal agency entities
   * @returns {Promise<Entity[]>}
   */
  async getActiveFederalAgencyEntities(): Promise<Entity[]> {
    try {
      return await prisma.entity.findMany({
        where: {
          active: true,
          type: UserType.FEDERAL_AGENCY,
        },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      logError(
        'Error fetching active federal agency entities',
        error as Error,
        {
          operation: 'getActiveFederalAgencyEntities',
          component: 'entities_services',
          additionalData: {
            error: sanitizeForLogs(String(error)),
          },
        }
      );
      throw new Error('Error fetching active federal agency entities');
    }
  }

  /**
   * Get entity by ID
   * @param {number} id
   * @returns {Promise<Entity | null>}
   */
  async getEntityById(id: number): Promise<Entity | null> {
    try {
      return await prisma.entity.findUnique({
        where: { id },
      });
    } catch (error) {
      logError('Error fetching entity by id', error as Error, {
        operation: 'getEntityById',
        component: 'entities_services',
        additionalData: {
          entityId: sanitizeForLogs(id.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching entity by id');
    }
  }

  /**
   * Get entity by abbreviation
   * @param {string} abbreviation
   * @returns {Promise<Entity | null>}
   */
  async getEntityByAbbreviation(abbreviation: string): Promise<Entity | null> {
    try {
      return await prisma.entity.findUnique({
        where: { abbreviation },
      });
    } catch (error) {
      logError('Error fetching entity by abbreviation', error as Error, {
        operation: 'getEntityByAbbreviation',
        component: 'entities_services',
        additionalData: {
          abbreviation: sanitizeForLogs(abbreviation),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching entity by abbreviation');
    }
  }

  /**
   * Retrieves an entity by user ID.
   * @param userId - The ID of the user to find the entity for.
   * @returns The entity associated with the user ID, or null if not found.
   */
  async getEntityByUserId(userId: number) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          entity: true, // Include the related entity information
        },
      });
      if (!user || !user.entity) {
        logWithOperation('warn', 'Entity for user not found', null, {
          userId: sanitizeForLogs(userId.toString()),
        });
        return null;
      }
      return user.entity;
    } catch (error) {
      logError('Error fetching user entity', error as Error, {
        operation: 'getEntityByUserId',
        component: 'entities_services',
        additionalData: {
          userId: sanitizeForLogs(userId.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching user entity');
    }
  }
}
