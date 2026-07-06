import { Prisma, Denial as DenialModel } from '@prisma/client';

import { logError, logWithOperation } from '../utils/structuredLogger.js';
import { components } from '../types/requests.js';
import prisma from '../utils/database.js';
import { sanitizeForLogs } from '../utils/sanitize.js';

import { UsersService } from './users.js';
export type DenialType = components['schemas']['Denial'];
type DenialCreate = Prisma.DenialUncheckedCreateInput;

/**
 * Converts a Prisma denial object to an OpenAPI denial object.
 * @param {DenialModel} prismaDenial - The Prisma denial object.
 * @param {string | null} userExternalId - The external user ID.
 * @returns {DenialType} - The converted OpenAPI denial object.
 */
export async function convertDenialPrismaToOpenAPI(
  prismaDenial: DenialModel,
  userExternalId?: string | null
): Promise<DenialType> {
  return {
    id: prismaDenial.id,
    request_id: prismaDenial.request_id,
    user_id: userExternalId || undefined,
    date_denied:
      prismaDenial.date_denied?.toISOString() || new Date().toISOString(),
    reason: prismaDenial.reason,
    read: prismaDenial.read,
    is_final: prismaDenial.is_final,
    createdAt: prismaDenial.createdAt?.toISOString(),
    updatedAt: prismaDenial.updatedAt?.toISOString(),
  };
}

/**
 * Converts an OpenAPI denial object to a Prisma denial object.
 * @param {DenialType} denial - The OpenAPI denial object.
 * @returns {DenialCreate} - The converted Prisma denial object.
 */
function convertDenialOpenAPIToPrisma(denial: DenialType): DenialCreate {
  return {
    request_id: denial.request_id,
    user_id: undefined, // Will be set in the create method after user lookup
    date_denied: denial.date_denied ? new Date(denial.date_denied) : new Date(),
    reason: denial.reason ?? null,
    read: denial.read ?? false,
    is_final: denial.is_final ?? false,
  };
}

export class DenialService {
  /**
   * Creates a new denial record in the database.
   * @param {DenialType} denial - The denial data to create.
   * @returns {Promise<DenialType>} - The created denial record.
   */
  async create(denial: DenialType): Promise<DenialType> {
    try {
      // Validate required "reason" field only for final denials
      if (denial.is_final && (!denial.reason || denial.reason.trim() === '')) {
        logWithOperation(
          'warn',
          'Denial creation failed: reason is required for final denials'
        );
        throw new Error('A reason must be provided for final denials.');
      }

      // Look up user by external ID if provided
      let internalUserId: number | undefined;
      if (denial.user_id) {
        const user = await new UsersService().getUserByExternalId(
          denial.user_id
        );
        if (!user) {
          logWithOperation('warn', 'User not found for denial', null, {
            userExternalId: sanitizeForLogs(denial.user_id),
          });
          throw new Error(`User with external ID ${denial.user_id} not found`);
        }
        if (user.entity.type !== 'NTIA') {
          logWithOperation(
            'warn',
            'Non-NTIA user attempted to create denial',
            null,
            {
              userExternalId: sanitizeForLogs(denial.user_id),
            }
          );
          throw new Error(
            `User with external ID ${denial.user_id} is not NTIA`
          );
        }
        internalUserId = user.id;
      }

      const prismaData = convertDenialOpenAPIToPrisma(denial);
      prismaData.user_id = internalUserId;

      const createdDenial = await prisma.denial.create({ data: prismaData });

      return await convertDenialPrismaToOpenAPI(createdDenial, denial.user_id);
    } catch (error) {
      logError('Error creating denial', error as Error, {
        operation: 'create',
        component: 'denials_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error creating denial');
    }
  }

  /**
   * Retrieves all denials for a specific request.
   * For COMMERCIAL users, validates access to the request first.
   * @param {number} requestId - The ID of the request.
   * @param {string} userExternalId - The external user ID for access validation.
   * @returns {Promise<DenialType[]>} - List of denials for the request.
   */
  async getByRequestId(
    requestId: number,
    userExternalId?: string
  ): Promise<DenialType[]> {
    try {
      // If userExternalId is provided, validate user access and filter by entity
      if (userExternalId) {
        const user = await new UsersService().getUserByExternalId(
          userExternalId
        );
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
                'Users can only view denials for requests created by their own entity'
              );
            }
          }
          // NTIA and FEDERAL_AGENCY users can see all denials, so no restriction applied
        }
      }

      const denials = await prisma.denial.findMany({
        where: { request_id: requestId },
        orderBy: { date_denied: 'desc' },
      });

      const usersService = new UsersService();
      const convertedDenials: DenialType[] = [];

      for (const denial of denials) {
        let userExternalId: string | null = null;
        if (denial.user_id) {
          userExternalId = await usersService.getUserExternalId(denial.user_id);
        }
        const converted = await convertDenialPrismaToOpenAPI(
          denial,
          userExternalId
        );
        convertedDenials.push(converted);
      }

      return convertedDenials;
    } catch (error) {
      logError('Error fetching denials for request', error as Error, {
        operation: 'getByRequestId',
        component: 'denials_services',
        additionalData: {
          requestId: sanitizeForLogs(requestId.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching denials for request');
    }
  }

  /**
   * Retrieves all denial records from the database.
   * @returns {Promise<DenialType[]>}
   */
  async getDenials(): Promise<DenialType[]> {
    try {
      const denials = await prisma.denial.findMany();

      const usersService = new UsersService();
      const convertedDenials: DenialType[] = [];

      for (const denial of denials) {
        let userExternalId: string | null = null;
        if (denial.user_id) {
          userExternalId = await usersService.getUserExternalId(denial.user_id);
        }
        const converted = await convertDenialPrismaToOpenAPI(
          denial,
          userExternalId
        );
        convertedDenials.push(converted);
      }

      return convertedDenials;
    } catch (error) {
      logError('Error fetching denials', error as Error, {
        operation: 'getDenials',
        component: 'denials_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching denials');
    }
  }

  /**
   * Retrieves a denial record by its ID.
   * @param {number} id - The ID of the denial to retrieve.
   * @returns {Promise<DenialType | null>}
   */
  async getDenialById(id: number): Promise<DenialType | null> {
    try {
      const denial = await prisma.denial.findUnique({ where: { id } });
      if (!denial) {
        logWithOperation('warn', 'Denial not found', null, {
          denialId: id,
        });
        return null;
      }

      // Mark as read
      await prisma.denial.update({
        where: { id },
        data: { read: true },
      });

      // Convert to OpenAPI format with user lookup
      const usersService = new UsersService();
      let userExternalId: string | null = null;
      if (denial.user_id) {
        userExternalId = await usersService.getUserExternalId(denial.user_id);
      }

      return await convertDenialPrismaToOpenAPI(denial, userExternalId);
    } catch (error) {
      logError('Error fetching denial by id', error as Error, {
        operation: 'getDenialById',
        component: 'denials_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching denial by id');
    }
  }
}
