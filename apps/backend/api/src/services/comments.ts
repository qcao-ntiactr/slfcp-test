import { Prisma, Comment as CommentModel } from '@prisma/client';

import { logError, logWithOperation } from '../utils/structuredLogger.js';
import { components } from '../types/requests.js';
import prisma from '../utils/database.js';
import { sanitizeForLogs } from '../utils/sanitize.js';

import { UsersService } from './users.js';
export type CommentType = components['schemas']['Comment'];
type CommentCreateInput = Prisma.CommentUncheckedCreateInput;

/**
 * Converts an OpenAPI comment object to a Prisma comment input object.
 * @param {CommentType} comment
 * @returns {CommentCreateInput}
 */
function convertCommentOpenAPIToPrisma(
  comment: CommentType
): CommentCreateInput {
  return {
    request_id: comment.request_id,
    user_id: undefined,
    comment: comment.comment,
    is_internal: comment.is_internal ?? false,
    createdAt: comment.createdAt ? new Date(comment.createdAt) : undefined,
  };
}

export class CommentService {
  /**
   * Validates that only NTIA or FEDERAL_AGENCY users can create, update, or delete comments.
   */
  private async validateUserCanModifyComments(userId: number): Promise<void> {
    // Get the user with their entity information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { entity: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Only NTIA and FEDERAL_AGENCY users can create, update, or delete comments
    if (user.entity.type !== 'NTIA' && user.entity.type !== 'FEDERAL_AGENCY') {
      throw new Error(
        'Only NTIA and FEDERAL_AGENCY users can create, update, or delete comments'
      );
    }
  }

  /**
   * Creates a new comment.
   */
  async create(comment: CommentType): Promise<CommentModel> {
    try {
      const user = await new UsersService().getUserByExternalId(
        comment.user_id
      );
      if (!user) {
        logWithOperation('warn', 'User not found for comment', null, {
          userExternalId: sanitizeForLogs(comment.user_id),
        });
        throw new Error(`User with external ID ${comment.user_id} not found`);
      }

      // Validate that user can create comments
      await this.validateUserCanModifyComments(user.id);

      const prismaData = convertCommentOpenAPIToPrisma(comment);
      prismaData.user_id = user.id;
      return await prisma.comment.create({ data: prismaData });
    } catch (error) {
      logError('Error creating comment', error as Error, {
        operation: 'create',
        component: 'comments_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error creating comment');
    }
  }

  /**
   * Retrieves all comments.
   */
  async getComments(): Promise<CommentModel[]> {
    try {
      const comments = await prisma.comment.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              entity: {
                select: {
                  type: true,
                  name: true,
                  abbreviation: true,
                },
              },
            },
          },
        },
      });

      return comments.map((comment) => {
        const isFederal = comment.user?.entity?.type === 'FEDERAL_AGENCY';

        return {
          ...comment,
          user_name: comment.user?.name ?? '',
          user_type: comment.user?.entity?.type ?? 'COMMERCIAL',
          federal_agency_name: isFederal
            ? (comment.user?.entity?.name ?? null)
            : null,
          federal_agency_abbr: isFederal
            ? (comment.user?.entity?.abbreviation ?? null)
            : null,
          user: undefined, // Clean up nested relation
        };
      });
    } catch (error) {
      logError('Error fetching comments', error as Error, {
        operation: 'getComments',
        component: 'comments_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching comments');
    }
  }

  /**
   * Retrieves all comments for a specific request.
   * For COMMERCIAL users, validates access to the request first.
   * @param {number} requestId
   * @param {string} userExternalId - The external user ID for access validation.
   */
  async getByRequestId(
    requestId: number,
    userExternalId?: string
  ): Promise<CommentModel[]> {
    try {
      // Prepare where clause
      const whereClause: Prisma.CommentWhereInput = { request_id: requestId };

      // If userExternalId is provided, validate user access, filter by entity, and exclude internal for commercial
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
                'Users can only view comments for requests created by their own entity'
              );
            }

            // Exclude internal comments for commercial users
            whereClause.is_internal = false;
          }
          // NTIA and FEDERAL_AGENCY users can see all comments, so no restriction applied
        }
      }

      const comments = await prisma.comment.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              entity: {
                select: {
                  type: true,
                  name: true,
                  abbreviation: true,
                },
              },
            },
          },
        },
      });

      return comments.map((comment) => {
        const isFederal = comment.user?.entity?.type === 'FEDERAL_AGENCY';

        return {
          ...comment,
          user_name: comment.user?.name ?? '',
          user_type: comment.user?.entity?.type ?? 'COMMERCIAL',
          federal_agency_name: isFederal
            ? (comment.user?.entity?.name ?? null)
            : null,
          federal_agency_abbr: isFederal
            ? (comment.user?.entity?.abbreviation ?? null)
            : null,
          user: undefined, // Clean up nested relation from response
        };
      });
    } catch (error) {
      logError('Error fetching comments for request', error as Error, {
        operation: 'getByRequestId',
        component: 'comments_services',
        additionalData: {
          requestId: sanitizeForLogs(requestId.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching comments for request');
    }
  }

  /**
   * Retrieves a specific comment by ID.
   */
  async getCommentById(id: number): Promise<CommentModel | null> {
    try {
      const comment = await prisma.comment.findUnique({ where: { id } });
      if (!comment) {
        logWithOperation('warn', 'Comment not found', null, {
          commentId: id,
        });
        return null;
      }
      return comment;
    } catch (error) {
      logError('Error fetching comment by id', error as Error, {
        operation: 'getCommentById',
        component: 'comments_services',
        additionalData: {
          commentId: sanitizeForLogs(id.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching comment by id');
    }
  }

  /**
   * Updates a comment by ID.
   */
  async updateComment(
    id: number,
    updates: Partial<CommentType>,
    userExternalId: string
  ): Promise<CommentModel | null> {
    try {
      // Get the user and validate they can modify comments
      const user = await new UsersService().getUserByExternalId(userExternalId);
      if (!user) {
        logWithOperation('warn', 'User not found for comment update', null, {
          userExternalId: sanitizeForLogs(userExternalId),
        });
        throw new Error(`User with external ID ${userExternalId} not found`);
      }

      await this.validateUserCanModifyComments(user.id);

      const { user_id, ...otherUpdates } = updates; // eslint-disable-line @typescript-eslint/no-unused-vars
      const updated = await prisma.comment.update({
        where: { id },
        data: {
          ...otherUpdates,
          createdAt: updates.createdAt
            ? new Date(updates.createdAt)
            : undefined,
        },
      });
      return updated;
    } catch (error) {
      logError('Error updating comment', error as Error, {
        operation: 'updateComment',
        component: 'comments_services',
        additionalData: {
          commentId: sanitizeForLogs(id.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      return null;
    }
  }

  /**
   * Deletes a comment by ID.
   */
  async deleteComment(id: number, userExternalId: string): Promise<boolean> {
    try {
      // Get the user and validate they can modify comments
      const user = await new UsersService().getUserByExternalId(userExternalId);
      if (!user) {
        logWithOperation('warn', 'User not found for comment update', null, {
          userExternalId: sanitizeForLogs(userExternalId),
        });
        throw new Error(`User with external ID ${userExternalId} not found`);
      }

      await this.validateUserCanModifyComments(user.id);

      await prisma.comment.delete({ where: { id } });
      return true;
    } catch (error) {
      logError('Error deleting comment', error as Error, {
        operation: 'delete',
        component: 'comments_services',
        additionalData: {
          commentId: sanitizeForLogs(id.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      return false;
    }
  }
}
