import { Prisma, Approval as ApprovalModel } from '@prisma/client';

import { logError, logWithOperation } from '../utils/structuredLogger.js';
import { components } from '../types/requests.js';
import prisma from '../utils/database.js';
import { sanitizeForLogs } from '../utils/sanitize.js';

import { UsersService } from './users.js';
export type ApprovalType = components['schemas']['Approval'];

type ApprovalCreate = Prisma.ApprovalUncheckedCreateInput;

/**
 * Converts a Prisma approval object to an OpenAPI approval object.
 * @param {ApprovalModel} prismaApproval - The Prisma approval object.
 * @param {string | null} userExternalId - The external user ID.
 * @returns {ApprovalType} - The converted OpenAPI approval object.
 */
export async function convertApprovalPrismaToOpenAPI(
  prismaApproval: ApprovalModel,
  userExternalId?: string | null
): Promise<ApprovalType> {
  return {
    id: prismaApproval.id,
    request_id: prismaApproval.request_id,
    user_id: userExternalId || undefined,
    date_approved:
      prismaApproval.date_approved?.toISOString() || new Date().toISOString(),
    condition: prismaApproval.condition,
    read: prismaApproval.read,
    is_final: prismaApproval.is_final,
    createdAt: prismaApproval.createdAt?.toISOString(),
    updatedAt: prismaApproval.updatedAt?.toISOString(),
  };
}

/**
 * Converts an OpenAPI approval object to a Prisma approval object.
 * @param {ApprovalType} approval - The OpenAPI approval object.
 * @returns {ApprovalCreate} - The converted Prisma approval object.
 */
function convertApprovalOpenAPIToPrisma(
  approval: ApprovalType
): ApprovalCreate {
  return {
    request_id: approval.request_id,
    user_id: undefined, // Will be set in the create method after user lookup
    date_approved: approval.date_approved
      ? new Date(approval.date_approved)
      : new Date(),
    condition: approval.condition,
    read: approval.read ?? false,
    is_final: approval.is_final ?? false,
  };
}

export class ApprovalService {
  /**
   * Creates a new approval record in the database.
   * @param {ApprovalType} approval - The approval data to create.
   * @returns {Promise<ApprovalType>} - The created approval record.
   */
  async create(approval: ApprovalType): Promise<ApprovalType> {
    try {
      // Look up user by external ID if provided
      let internalUserId: number | undefined;
      if (approval.user_id) {
        const user = await new UsersService().getUserByExternalId(
          approval.user_id
        );
        if (!user) {
          logWithOperation('warn', 'User not found for approval', null, {
            userExternalId: sanitizeForLogs(approval.user_id),
          });
          throw new Error(
            `User with external ID ${approval.user_id} not found`
          );
        }
        if (user.entity.type !== 'NTIA') {
          logWithOperation(
            'warn',
            'Non-NTIA user attempted to create approval',
            null,
            {
              userExternalId: sanitizeForLogs(approval.user_id),
            }
          );
          throw new Error(
            `User with external ID ${approval.user_id} is not NTIA`
          );
        }
        internalUserId = user.id;
      }

      const prismaData = convertApprovalOpenAPIToPrisma(approval);
      prismaData.user_id = internalUserId;
      const createdApproval = await prisma.approval.create({
        data: prismaData,
      });
      // Return the converted approval with external user ID
      return await convertApprovalPrismaToOpenAPI(
        createdApproval,
        approval.user_id
      );
    } catch (error) {
      logError('Error creating approval', error as Error, {
        operation: 'create',
        component: 'approvals_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error creating approval');
    }
  }

  /**
   * Retrieves all approvals for a given request ID.
   * For COMMERCIAL users, validates access to the request first.
   * @param {number} requestId - The ID of the request.
   * @param {string} userExternalId - The external user ID for access validation.
   * @returns {Promise<ApprovalType[]>} - List of approvals for the request.
   */
  async getByRequestId(
    requestId: number,
    userExternalId?: string
  ): Promise<ApprovalType[]> {
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
                'Users can only view approvals for requests created by their own entity'
              );
            }
          }
          // NTIA and FEDERAL_AGENCY users can see all approvals, so no restriction applied
        }
      }

      const approvals = await prisma.approval.findMany({
        where: { request_id: requestId },
        orderBy: { date_approved: 'desc' },
      });

      const usersService = new UsersService();
      const convertedApprovals: ApprovalType[] = [];

      for (const approval of approvals) {
        let userExternalId: string | null = null;
        if (approval.user_id) {
          userExternalId = await usersService.getUserExternalId(
            approval.user_id
          );
        }
        const converted = await convertApprovalPrismaToOpenAPI(
          approval,
          userExternalId
        );
        convertedApprovals.push(converted);
      }

      return convertedApprovals;
    } catch (error) {
      logError('Error fetching approvals for request', error as Error, {
        operation: 'getByRequestId',
        component: 'approvals_services',
        additionalData: {
          requestId: sanitizeForLogs(requestId.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching approvals for request');
    }
  }

  /**
   * Retrieves all approval records.
   * @returns {Promise<ApprovalType[]>}
   */
  async getApprovals(): Promise<ApprovalType[]> {
    try {
      const approvals = await prisma.approval.findMany();

      const usersService = new UsersService();
      const convertedApprovals: ApprovalType[] = [];

      for (const approval of approvals) {
        let userExternalId: string | null = null;
        if (approval.user_id) {
          userExternalId = await usersService.getUserExternalId(
            approval.user_id
          );
        }
        const converted = await convertApprovalPrismaToOpenAPI(
          approval,
          userExternalId
        );
        convertedApprovals.push(converted);
      }

      return convertedApprovals;
    } catch (error) {
      logError('Error fetching approvals', error as Error, {
        operation: 'getApprovals',
        component: 'approvals_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching approvals');
    }
  }

  /**
   * Retrieves an approval by its ID.
   * @param {number} id
   * @returns {Promise<ApprovalType | null>}
   */
  async getApprovalById(id: number): Promise<ApprovalType | null> {
    try {
      const approval = await prisma.approval.findUnique({ where: { id } });
      if (!approval) {
        logWithOperation('warn', 'Approval not found', null, {
          approvalId: id,
        });
        return null;
      }

      // Mark as read
      await prisma.approval.update({
        where: { id },
        data: { read: true },
      });

      // Convert to OpenAPI format with user lookup
      const usersService = new UsersService();
      let userExternalId: string | null = null;
      if (approval.user_id) {
        userExternalId = await usersService.getUserExternalId(approval.user_id);
      }

      return await convertApprovalPrismaToOpenAPI(approval, userExternalId);
    } catch (error) {
      logError('Error fetching approval by id', error as Error, {
        operation: 'getApprovalById',
        component: 'approvals_services',
        additionalData: {
          approvalId: sanitizeForLogs(id.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching approval by id');
    }
  }
}
