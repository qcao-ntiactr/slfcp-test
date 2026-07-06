import { Prisma } from '@prisma/client';

import { logError, logWithOperation } from '../utils/structuredLogger.js';
import prisma from '../utils/database.js';
import { sanitizeForLogs } from '../utils/sanitize.js';

export class MessageReadStatusService {
  /**
   * Marks a specific message as read by a user
   * @param messageId - The ID of the message to mark as read
   * @param userId - The ID of the user marking the message as read
   */
  async markMessageAsRead(messageId: number, userId: number): Promise<void> {
    try {
      await prisma.messageReadStatus.upsert({
        where: {
          message_id_user_id: {
            message_id: messageId,
            user_id: userId,
          },
        },
        update: {
          readAt: new Date(),
        },
        create: {
          message_id: messageId,
          user_id: userId,
          readAt: new Date(),
        },
      });
    } catch (error) {
      logError('Error marking message as read', error as Error, {
        operation: 'getUnreadMessageCountForUser',
        component: 'messageReadStatus_services',
        additionalData: {
          messageId: sanitizeForLogs(messageId.toString()),
          userId: sanitizeForLogs(userId.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error getting unread message count for user');
    }
  }

  /**
   * Marks all messages in an inquiry as read by a user
   * @param inquiryId - The ID of the inquiry
   * @param userId - The ID of the user marking messages as read
   */
  async markAllInquiryMessagesAsRead(
    inquiryId: number,
    userId: number
  ): Promise<void> {
    try {
      // Get all message IDs for the inquiry that don't already have read status for this user
      const messages = await prisma.message.findMany({
        where: {
          inquiry_id: inquiryId,
          // Only get messages that don't already have a read status for this user
          readStatuses: {
            none: {
              user_id: userId,
            },
          },
        },
        select: { id: true },
      });

      if (messages.length === 0) {
        logWithOperation('info', 'No unread messages found for inquiry', null, {
          inquiryId: inquiryId,
          userId: userId,
        });
        return;
      }

      // Create read status records for unread messages only
      const readStatusData = messages.map((message) => ({
        message_id: message.id,
        user_id: userId,
        readAt: new Date(),
      }));

      logWithOperation(
        'info',
        'Creating read status records for inquiry',
        null,
        {
          recordCount: readStatusData.length,
          inquiryId: inquiryId,
          userId: userId,
        }
      );

      // Use individual upserts to avoid sequence gaps from skipDuplicates
      const results = await Promise.all(
        readStatusData.map((data) =>
          prisma.messageReadStatus.upsert({
            where: {
              message_id_user_id: {
                message_id: data.message_id,
                user_id: data.user_id,
              },
            },
            update: {
              readAt: data.readAt,
            },
            create: data,
          })
        )
      );

      logWithOperation(
        'info',
        'Successfully processed read status records',
        null,
        {
          recordCount: results.length,
        }
      );

      // Log the current max ID to track sequence issues
      const maxId = await prisma.messageReadStatus.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true },
      });
      logWithOperation('info', 'Current max MessageReadStatus ID', null, {
        maxId: maxId?.id || 'none',
      });
    } catch (error) {
      logError(
        'Error marking all messages in inquiry as read',
        error as Error,
        {
          operation: 'markAllInquiryMessagesAsRead',
          component: 'messageReadStatus_services',
          additionalData: {
            inquiryId: sanitizeForLogs(inquiryId.toString()),
            userId: sanitizeForLogs(userId.toString()),
            error: sanitizeForLogs(String(error)),
          },
        }
      );
      throw new Error('Error marking all messages in inquiry as read');
    }
  }

  /**
   * Gets the count of unread messages for a user across all requests
   * @param userId - The ID of the user
   * @param requestId - Optional: filter by specific request ID
   * @returns The count of unread messages
   */
  async getUnreadMessageCountForUser(
    userId: number,
    requestId?: number
  ): Promise<number> {
    try {
      // First, get the user's entity ID
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { entity_id: true },
      });

      if (!user) {
        logWithOperation('warn', 'User not found', null, {
          userId: userId,
        });
        return 0;
      }

      const userEntityId = user.entity_id;

      const whereClause: Prisma.MessageWhereInput = {
        // Exclude messages sent by the user themselves
        sender_id: { not: userId },
        // Only include messages that haven't been read by this user
        readStatuses: {
          none: {
            user_id: userId,
          },
        },
        inquiry: {
          // Only include inquiries where the user's entity is involved
          OR: [{ entityA_id: userEntityId }, { entityB_id: userEntityId }],
        },
      };

      // If requestId is provided, add it to the filter
      if (requestId) {
        whereClause.inquiry = {
          AND: [
            {
              request_id: requestId,
            },
            {
              // Only include inquiries where the user's entity is involved
              OR: [{ entityA_id: userEntityId }, { entityB_id: userEntityId }],
            },
          ],
        };
      }

      const count = await prisma.message.count({
        where: whereClause,
      });

      return count;
    } catch (error) {
      logError('Error getting unread message count for user', error as Error, {
        operation: 'getUnreadMessageCountForUser',
        component: 'messageReadStatus_services',
        additionalData: {
          userId: sanitizeForLogs(userId.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error getting unread message count for user');
    }
  }

  /**
   * Gets unread message counts grouped by request ID for a user
   * @param userId - The ID of the user
   * @returns Record mapping request IDs to unread message counts
   */
  async getUnreadMessageCountsByRequest(
    userId: number
  ): Promise<Record<number, number>> {
    try {
      // First, get the user's entity ID
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { entity_id: true },
      });

      if (!user) {
        logWithOperation('warn', 'User not found', null, {
          userId: userId,
        });
        return {};
      }

      const userEntityId = user.entity_id;

      const unreadMessages = await prisma.message.findMany({
        where: {
          // Exclude messages sent by the user themselves
          sender_id: { not: userId },
          // Only include messages that haven't been read by this user
          readStatuses: {
            none: {
              user_id: userId,
            },
          },
          inquiry: {
            // Only include inquiries where the user's entity is involved
            OR: [{ entityA_id: userEntityId }, { entityB_id: userEntityId }],
          },
        },
        include: {
          inquiry: {
            select: {
              request_id: true,
            },
          },
        },
      });

      // Group by request ID and count
      const countsByRequest: Record<number, number> = {};

      unreadMessages.forEach((message) => {
        const requestId = message.inquiry.request_id;
        countsByRequest[requestId] = (countsByRequest[requestId] || 0) + 1;
      });

      return countsByRequest;
    } catch (error) {
      logError(
        'Error getting unread message counts by request for user',
        error as Error,
        {
          operation: 'markAllInquiryMessagesAsRead',
          component: 'messageReadStatus_services',
          additionalData: {
            userId: sanitizeForLogs(userId.toString()),
            error: sanitizeForLogs(String(error)),
          },
        }
      );
      throw new Error(
        'Error getting unread message counts by request for user'
      );
    }
  }

  /**
   * Gets unread message counts for specific requests for a user
   * @param userId - The ID of the user
   * @param requestIds - Array of request IDs to check
   * @returns Record mapping request IDs to unread message counts
   */
  async getUnreadMessageCountsForRequests(
    userId: number,
    requestIds: number[]
  ): Promise<Record<number, number>> {
    try {
      if (requestIds.length === 0) {
        return {};
      }

      // First, get the user's entity ID
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { entity_id: true, external_id: true },
      });

      if (!user) {
        logWithOperation('warn', 'User not found', null, {
          userId: userId,
        });
        return {};
      }

      const userEntityId = user.entity_id;

      const unreadMessages = await prisma.message.findMany({
        where: {
          // Exclude messages sent by the user themselves
          sender_id: { not: userId },
          // Only include messages that haven't been read by this user
          readStatuses: {
            none: {
              user_id: userId,
            },
          },
          inquiry: {
            request_id: {
              in: requestIds,
            },
            // Only include inquiries where the user's entity is involved
            OR: [{ entityA_id: userEntityId }, { entityB_id: userEntityId }],
          },
        },
        include: {
          inquiry: {
            select: {
              request_id: true,
              entityA_id: true,
              entityB_id: true,
            },
          },
        },
      });

      // Group by request ID and count
      const countsByRequest: Record<number, number> = {};

      // Initialize all request IDs with 0
      requestIds.forEach((requestId) => {
        countsByRequest[requestId] = 0;
      });

      // Count unread messages per request
      unreadMessages.forEach((message) => {
        const requestId = message.inquiry.request_id;
        countsByRequest[requestId] = (countsByRequest[requestId] || 0) + 1;
      });

      return countsByRequest;
    } catch (error) {
      logError(
        'Error getting unread message counts for specific requests for user',
        error as Error,
        {
          operation: 'getUnreadMessageCountsForRequests',
          component: 'messageReadStatus_services',
          additionalData: {
            userId: sanitizeForLogs(userId.toString()),
            error: sanitizeForLogs(String(error)),
          },
        }
      );
      throw new Error(
        'Error getting unread message counts for specific requests for user'
      );
    }
  }
}
