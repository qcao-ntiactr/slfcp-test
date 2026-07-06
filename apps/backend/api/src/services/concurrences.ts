import { Prisma, Concurrence as ConcurrenceModel } from '@prisma/client';

import { logError, logWithOperation } from '../utils/structuredLogger.js';
import { components } from '../types/requests.js';
import prisma from '../utils/database.js';
import { sanitizeForLogs } from '../utils/sanitize.js';

import { UsersService } from './users.js';

// Type for Concurrence with user and entity relations
type ConcurrenceWithUser = ConcurrenceModel & {
  user?: {
    external_id: string;
    name: string;
    entity: {
      id: number;
      name: string;
      abbreviation: string;
      type: string;
    };
  } | null;
};
const usersService = new UsersService();
export type ConcurrenceType = components['schemas']['Concurrence'];
type ConcurrenceCreate = Prisma.ConcurrenceUncheckedCreateInput;

/**
 * Converts a Prisma concurrence object to an OpenAPI concurrence object.
 * @param {ConcurrenceWithUser} prismaConcurrence
 * @returns {ConcurrenceType}
 */
export function convertConcurrencePrismaToOpenAPI(
  prismaConcurrence: ConcurrenceWithUser
): ConcurrenceType {
  return {
    id: prismaConcurrence.id,
    request_id: prismaConcurrence.request_id,
    user_id: prismaConcurrence.user?.external_id ?? '',
    user_name: prismaConcurrence.user?.name ?? '',
    user_type:
      (prismaConcurrence.user?.entity?.type as
        | 'NTIA'
        | 'FEDERAL_AGENCY'
        | 'COMMERCIAL') ?? 'COMMERCIAL',
    entity_id: prismaConcurrence.user?.entity?.id ?? null,
    entity_name: prismaConcurrence.user?.entity?.name ?? null,
    entity_abbr: prismaConcurrence.user?.entity?.abbreviation ?? null,
    concurred: prismaConcurrence.concurred,
    conditions: prismaConcurrence.conditions ?? '',
    createdAt: prismaConcurrence.createdAt.toISOString(),
    updatedAt: prismaConcurrence.updatedAt.toISOString(),
  };
}

/**
 * Converts an OpenAPI concurrence object to a Prisma concurrence object.
 * @param {ConcurrenceType} concurrence
 * @returns {ConcurrenceCreate}
 */
function convertConcurrenceOpenAPIToPrisma(
  concurrence: ConcurrenceType
): ConcurrenceCreate {
  return {
    request_id: concurrence.request_id,
    user_id: undefined, // Will be set after user lookup
    concurred: concurrence.concurred ?? false,
    conditions: concurrence.conditions || null,
    createdAt: concurrence.createdAt
      ? new Date(concurrence.createdAt)
      : undefined,
    updatedAt: concurrence.updatedAt
      ? new Date(concurrence.updatedAt)
      : undefined,
  };
}

export class ConcurrenceService {
  /**
   * Validates that only FEDERAL_AGENCY users can create concurrences.
   */
  private async validateUserCanModifyConcurrences(
    userId: number
  ): Promise<void> {
    // Get the user with their entity information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { entity: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Only FEDERAL_AGENCY users can create concurrences
    if (user.entity.type !== 'FEDERAL_AGENCY') {
      throw new Error('Only FEDERAL_AGENCY users can create concurrences');
    }
  }

  /**
   * Creates a new concurrence.
   * @param {ConcurrenceType} concurrence
   * @returns {Promise<ConcurrenceModel>}
   */
  async create(concurrence: ConcurrenceType): Promise<ConcurrenceModel> {
    try {
      if (!concurrence.user_id) {
        throw new Error('user_id is required but was not provided');
      }

      // Look up user by external_id
      const user = await usersService.getUserByExternalId(concurrence.user_id);
      if (!user) {
        logWithOperation('warn', 'User not found for concurrence', null, {
          userExternalId: sanitizeForLogs(concurrence.user_id),
        });
        throw new Error(
          `User with external ID ${concurrence.user_id} not found`
        );
      }

      // Validate that user can create concurrences
      await this.validateUserCanModifyConcurrences(user.id);

      // Check if this entity has already submitted a concurrence for this request
      const existingConcurrence = await prisma.concurrence.findFirst({
        where: {
          request_id: concurrence.request_id,
          user: {
            entity_id: user.entity_id,
          },
        },
        include: {
          user: {
            include: {
              entity: true,
            },
          },
        },
      });

      if (existingConcurrence) {
        throw new Error(
          `Entity "${existingConcurrence.user?.entity.name}" has already submitted a concurrence for this request`
        );
      }

      const prismaData = convertConcurrenceOpenAPIToPrisma(concurrence);
      prismaData.user_id = user.id; // Use the internal user ID (integer)

      return await prisma.concurrence.create({
        data: prismaData,
        include: {
          user: {
            include: {
              entity: true,
            },
          },
        },
      });
    } catch (error) {
      logError('Error creating concurrence', error as Error, {
        operation: 'create',
        component: 'concurrences_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error creating concurrence');
    }
  }

  /**
   * Retrieves all concurrences.
   * @returns {Promise<ConcurrenceWithUser[]>}
   */
  async getConcurrences(): Promise<ConcurrenceWithUser[]> {
    try {
      return await prisma.concurrence.findMany({
        include: {
          user: {
            include: {
              entity: true,
            },
          },
        },
      });
    } catch (error) {
      logError('Error fetching concurrences', error as Error, {
        operation: 'getConcurrences',
        component: 'concurrences_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching concurrences');
    }
  }

  /**
   * Retrieves concurrences for a specific request.
   * For COMMERCIAL users, validates access to the request first.
   * @param {number} requestId
   * @param {string} userExternalId - The external user ID for access validation.
   * @returns {Promise<ConcurrenceWithUser[]>}
   */
  async getByRequestId(
    requestId: number,
    userExternalId?: string
  ): Promise<ConcurrenceWithUser[]> {
    try {
      // If userExternalId is provided, validate user access and filter by entity
      if (userExternalId) {
        const user = await usersService.getUserByExternalId(userExternalId);
        if (user) {
          const userWithEntity = await prisma.user.findUnique({
            where: { id: user.id },
            include: { entity: true },
          });

          if (userWithEntity && userWithEntity.entity.type === 'COMMERCIAL') {
            // Only apply entity restriction for COMMERCIAL users
            // Check if the request was created by a user from the same entity
            const request = await prisma.request.findUnique({
              where: { id: requestId },
              include: {
                user: {
                  include: { entity: true },
                },
              },
            });

            if (!request) {
              throw new Error('Request not found');
            }

            // Only allow access if the request was created by someone from the same entity
            if (request.user?.entity_id !== userWithEntity.entity_id) {
              throw new Error(
                'Users can only view concurrences for requests created by their own entity'
              );
            }
          }
          // NTIA and FEDERAL_AGENCY users can see all concurrences, so no restriction applied
        }
      }

      return await prisma.concurrence.findMany({
        where: { request_id: requestId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            include: {
              entity: true,
            },
          },
        },
      });
    } catch (error) {
      logError('Error fetching concurrences for request', error as Error, {
        operation: 'getByRequestId',
        component: 'concurrences_services',
        additionalData: {
          requestId: sanitizeForLogs(requestId.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching concurrences for request');
    }
  }

  /**
   * Retrieves a specific concurrence by its ID.
   * @param {number} id
   * @returns {Promise<ConcurrenceWithUser | null>}
   */
  async getConcurrenceById(id: number): Promise<ConcurrenceWithUser | null> {
    try {
      const concurrence = await prisma.concurrence.findUnique({
        where: { id },
        include: {
          user: {
            include: {
              entity: true,
            },
          },
        },
      });
      if (!concurrence) {
        logWithOperation('warn', 'Concurrence not found', null, {
          concurrenceId: id,
        });
        return null;
      }
      return concurrence;
    } catch (error) {
      logError('Error fetching concurrence by id', error as Error, {
        operation: 'getConcurrenceById',
        component: 'concurrences_services',
        additionalData: {
          concurrenceId: sanitizeForLogs(id.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching concurrence by id');
    }
  }
}
