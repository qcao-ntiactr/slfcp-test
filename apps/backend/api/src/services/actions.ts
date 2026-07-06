import { Prisma, Action as ActionModel } from '@prisma/client';

import { logError, logWithOperation } from '../utils/structuredLogger.js';
import { components } from '../types/requests.js';
import prisma from '../utils/database.js';
import { sanitizeForLogs } from '../utils/sanitize.js';

import { UsersService } from './users.js';
const usersService = new UsersService();
export type ActionType = components['schemas']['Action'];
type ActionCreateInput = Prisma.ActionUncheckedCreateInput;

/**
 * Converts a Prisma action object to an OpenAPI action object.
 */
export function convertActionPrismaToOpenAPI(
  prismaAction: ActionModel & {
    user?: {
      external_id: string;
      name: string;
      entity: { type: string; id: number };
    };
  }
): ActionType {
  return {
    id: prismaAction.id,
    request_id: prismaAction.request_id,
    federal_agency_id:
      prismaAction.user?.entity?.type === 'FEDERAL_AGENCY'
        ? prismaAction.user.entity.id
        : null,
    user_id: prismaAction.user?.external_id ?? '', // Get from related user
    user_name: prismaAction.user?.name ?? '', // Get from related user
    user_type:
      (prismaAction.user?.entity?.type as
        | 'NTIA'
        | 'FEDERAL_AGENCY'
        | 'COMMERCIAL') ?? 'COMMERCIAL', // Get from related user's entity
    action: prismaAction.action,
    details: prismaAction.details ?? null,
    createdAt: prismaAction.createdAt.toISOString(),
  };
}

/**
 * Converts an OpenAPI action object to a Prisma action input object.
 */
function convertActionOpenAPIToPrisma(action: ActionType): ActionCreateInput {
  return {
    request_id: action.request_id,
    user_id: undefined, // Will be set after user lookup
    action: action.action,
    details: action.details ?? null,
    createdAt: action.createdAt ? new Date(action.createdAt) : undefined,
  };
}

export class ActionService {
  /**
   * Gets the root request ID for a given request ID.
   * If the request is already a root request (root_request_id is null), returns the request ID itself.
   * If the request is a revision, returns the root_request_id.
   */
  private async getRootRequestId(requestId: number): Promise<number> {
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      select: { id: true, root_request_id: true },
    });

    if (!request) {
      throw new Error(`Request with ID ${requestId} not found`);
    }

    // If root_request_id is null, this is the root request
    return request.root_request_id ?? request.id;
  }

  /**
   * Validates that a COMMERCIAL user can only interact with requests from their own entity.
   */
  private async validateCommercialUserAccess(
    userId: number,
    requestId: number
  ): Promise<void> {
    // Get the user with their entity information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { entity: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // If user is COMMERCIAL, check if they can access this request
    if (user.entity.type === 'COMMERCIAL') {
      // Get the request with the user who created it and their entity
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

      // Check if the request was created by a user from the same entity
      if (request.user?.entity_id !== user.entity_id) {
        throw new Error(
          'COMMERCIAL users can only interact with requests from their own entity'
        );
      }
    }
  }

  /**
   * Creates a new action.
   */
  async create(action: ActionType): Promise<ActionModel> {
    try {
      // Validate required fields
      if (!action.user_id) {
        throw new Error('user_id is required');
      }

      // Look up user by external_id
      const user = await usersService.getUserByExternalId(action.user_id);
      if (!user) {
        logWithOperation('warn', 'User not found for action', null, {
          userExternalId: sanitizeForLogs(action.user_id),
        });
        throw new Error(`User with external ID ${action.user_id} not found`);
      }

      // Validate COMMERCIAL user access
      await this.validateCommercialUserAccess(user.id, action.request_id);

      // Get the root request ID instead of using the provided request ID
      const rootRequestId = await this.getRootRequestId(action.request_id);

      const prismaData = convertActionOpenAPIToPrisma(action);
      prismaData.user_id = user.id; // Use the internal user ID (integer)
      prismaData.request_id = rootRequestId; // Use the root request ID instead

      return await prisma.action.create({
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
      logError('Error creating action', error as Error, {
        operation: 'create',
        component: 'actions_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error creating action');
    }
  }

  /**
   * Retrieves all actions.
   * For COMMERCIAL users, only returns actions for requests from their own entity.
   */
  async getAll(userExternalId?: string): Promise<ActionModel[]> {
    try {
      let whereClause: Prisma.ActionWhereInput = {};

      // If userExternalId is provided and user is COMMERCIAL, filter by entity
      if (userExternalId) {
        const user = await usersService.getUserByExternalId(userExternalId);
        if (user) {
          const userWithEntity = await prisma.user.findUnique({
            where: { id: user.id },
            include: { entity: true },
          });

          if (userWithEntity?.entity.type === 'COMMERCIAL') {
            // Filter to only show actions for requests created by users from the same entity
            whereClause = {
              request: {
                user: {
                  entity_id: userWithEntity.entity_id,
                },
              },
            };
          }
        }
      }

      return await prisma.action.findMany({
        where: whereClause,
        include: {
          user: {
            include: {
              entity: true,
            },
          },
        },
      });
    } catch (error) {
      logError('Error fetching actions', error as Error, {
        operation: 'getAll',
        component: 'actions_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching actions');
    }
  }

  /**
   * Retrieves all actions for a specific request.
   * For COMMERCIAL users, validates access to the request first.
   * Note: This method expects to be called with root request IDs only.
   */
  async getByRequestId(
    requestId: number,
    userExternalId?: string
  ): Promise<
    (ActionModel & {
      federal_agency_name: string | null;
      federal_agency_abbr: string | null;
      user?: {
        external_id: string;
        name: string;
        entity: {
          id: number;
          type: string;
          name: string;
          abbreviation: string;
        };
      } | null;
    })[]
  > {
    try {
      // If userExternalId is provided, validate user access and filter by entity
      if (userExternalId) {
        const user = await usersService.getUserByExternalId(userExternalId);
        if (user) {
          const userWithEntity = await prisma.user.findUnique({
            where: { id: user.id },
            include: { entity: true },
          });

          if (userWithEntity) {
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
                'Users can only view actions for requests created by their own entity'
              );
            }
          }
        }
      }

      // Find all actions for the request ID (which should be a root request ID)
      const actions = await prisma.action.findMany({
        where: { request_id: requestId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              external_id: true,
              name: true,
              entity: {
                select: {
                  id: true,
                  type: true,
                  name: true,
                  abbreviation: true,
                },
              },
            },
          },
        },
      });

      return actions.map((action) => ({
        ...action,
        federal_agency_name:
          action.user?.entity?.type === 'FEDERAL_AGENCY'
            ? action.user.entity.name
            : null,
        federal_agency_abbr:
          action.user?.entity?.type === 'FEDERAL_AGENCY'
            ? action.user.entity.abbreviation
            : null,
      }));
    } catch (error) {
      logError('Error fetching actions for request', error as Error, {
        operation: 'getByRequestId',
        component: 'actions_services',
        additionalData: {
          requestId: sanitizeForLogs(requestId.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching actions for request');
    }
  }

  /**
   * Retrieves a specific action by ID.
   * For COMMERCIAL users, validates access to the associated request first.
   */
  async getById(
    id: number,
    userExternalId?: string
  ): Promise<ActionModel | null> {
    try {
      const action = await prisma.action.findUnique({
        where: { id },
        include: {
          user: {
            include: {
              entity: true,
            },
          },
        },
      });
      if (!action) {
        logWithOperation('warn', 'Action not found', null, {
          actionId: id,
        });
        return null;
      }

      // If userExternalId is provided, validate COMMERCIAL user access
      // Note: action.request_id contains the root request ID
      if (userExternalId) {
        const user = await usersService.getUserByExternalId(userExternalId);
        if (user) {
          await this.validateCommercialUserAccess(user.id, action.request_id);
        }
      }

      return action;
    } catch (error) {
      logError('Error fetching action by id', error as Error, {
        operation: 'getById',
        component: 'actions_services',
        additionalData: {
          actionId: sanitizeForLogs(id.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching action by id');
    }
  }

  /**
   * Updates an action by ID.
   * For COMMERCIAL users, validates access to the associated request first.
   */
  async update(
    id: number,
    updates: Partial<ActionType>,
    userExternalId?: string
  ): Promise<ActionModel | null> {
    try {
      // First get the action to find the request_id
      const existingAction = await prisma.action.findUnique({
        where: { id },
        select: { request_id: true },
      });

      if (!existingAction) {
        logWithOperation('warn', 'Action not found for update', null, {
          actionId: id,
        });
        return null;
      }

      // If userExternalId is provided, validate COMMERCIAL user access
      // Note: existingAction.request_id contains the root request ID
      if (userExternalId) {
        const user = await usersService.getUserByExternalId(userExternalId);
        if (user) {
          await this.validateCommercialUserAccess(
            user.id,
            existingAction.request_id
          );
        }
      }

      const { user_id, ...otherUpdates } = updates;

      // If user_id is provided, look up the user
      let userIdToUpdate = undefined;
      if (user_id) {
        const user = await usersService.getUserByExternalId(user_id);
        if (user) {
          userIdToUpdate = user.id;
        }
      }

      const updated = await prisma.action.update({
        where: { id },
        data: {
          ...otherUpdates,
          user_id: userIdToUpdate,
          createdAt: updates.createdAt
            ? new Date(updates.createdAt)
            : undefined,
        },
        include: {
          user: {
            include: {
              entity: true,
            },
          },
        },
      });
      return updated;
    } catch (error) {
      logError('Error updating action', error as Error, {
        operation: 'update',
        component: 'actions_services',
        additionalData: {
          actionId: sanitizeForLogs(id.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      return null;
    }
  }

  /**
   * Deletes an action by ID.
   * For COMMERCIAL users, validates access to the associated request first.
   */
  async delete(id: number, userExternalId?: string): Promise<boolean> {
    try {
      // First get the action to find the request_id
      const existingAction = await prisma.action.findUnique({
        where: { id },
        select: { request_id: true },
      });

      if (!existingAction) {
        logWithOperation('warn', 'Action not found for deletion', null, {
          actionId: id,
        });
        return false;
      }

      // If userExternalId is provided, validate COMMERCIAL user access
      // Note: existingAction.request_id contains the root request ID
      if (userExternalId) {
        const user = await usersService.getUserByExternalId(userExternalId);
        if (user) {
          await this.validateCommercialUserAccess(
            user.id,
            existingAction.request_id
          );
        }
      }

      await prisma.action.delete({ where: { id } });
      return true;
    } catch (error) {
      logError('Error deleting action', error as Error, {
        operation: 'delete',
        component: 'actions_services',
        additionalData: {
          actionId: sanitizeForLogs(id.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      return false;
    }
  }
}
