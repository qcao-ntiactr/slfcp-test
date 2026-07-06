import { Prisma, Inquiry as InquiryModel } from '@prisma/client';

import { logError, logWithOperation } from '../utils/structuredLogger.js';
import { components } from '../types/requests.js';
import prisma from '../utils/database.js';
import { sanitizeForLogs } from '../utils/sanitize.js';
export type InquiryType = components['schemas']['Inquiry'];
export type MessageType = components['schemas']['Message'];
type InquiryCreateInput = Prisma.InquiryCreateInput;
type MessageCreateInput = Prisma.MessageCreateInput;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const inquiryWithMessages = Prisma.validator<Prisma.InquiryDefaultArgs>()({
  include: { messages: true },
});
export type InquiryWithMessages = Prisma.InquiryGetPayload<
  typeof inquiryWithMessages
>;

/**
 * Converts a Prisma inquiry object with messages into the OpenAPI inquiry type.
 *
 * @param prismaInquiry - The inquiry object retrieved from Prisma, including its messages.
 * @returns The inquiry object formatted according to the OpenAPI specification.
 */
export function convertInquiryPrismaToOpenAPI(
  prismaInquiry: InquiryWithMessages
): InquiryType {
  return {
    ...prismaInquiry,
    closedBy_id: prismaInquiry.closedBy_id ?? undefined,
    closedAt: prismaInquiry.closedAt?.toISOString(),
    createdAt: prismaInquiry.createdAt.toISOString(),
    messages: prismaInquiry.messages.length
      ? prismaInquiry.messages.map((prismaMessages) => ({
          ...prismaMessages,
          sentAt: prismaMessages.sentAt.toISOString(),
        }))
      : [],
  };
}

/**
 * Converts a inquiry object from the OpenAPI format to a Prisma-compatible input object.
 *
 * @param inquiry - The inquiry object in OpenAPI format, or a partial version of it.
 * @param mode - Specifies the operation mode: 'create' for creating a new inquiry, or 'update' for updating an existing one. Defaults to 'create'.
 * @returns A Prisma-compatible input object for creating or updating a inquiry, including nested messages.
 */
export function convertInquiryOpenAPIToPrisma(
  inquiry: InquiryType | Partial<InquiryType>,
  mode: 'create' | 'update' = 'create'
): Prisma.InquiryCreateInput | Prisma.InquiryUpdateInput {
  const _inquiry = {
    ...inquiry,
    closedBy_id: inquiry.closedBy_id ?? null,
    closedAt: inquiry.closedAt ? new Date(inquiry.closedAt) : null,
  };

  const mappedMessages = (inquiry.messages ?? []).map((message) => ({
    id: message.id,
    inquiry_id: message.inquiry_id,
    sender_id: message.sender_id,
    content: message.content,
    sentAt: new Date(message.sentAt),
  }));

  const messages =
    mode === 'create'
      ? { create: mappedMessages }
      : {
          update: inquiry.messages?.map((message, index) => {
            if (!message.id) {
              throw new Error(
                `Missing message ID for update at index ${index}`
              );
            }
            return {
              where: { id: message.id },
              data: mappedMessages[index],
            };
          }),
        };

  return {
    ..._inquiry,
    messages,
  };
}

/**
 * Converts a message object from the OpenAPI format to a Prisma-compatible input object.
 *
 * @param message - The message object in OpenAPI format to be converted.
 * @returns A `MessageCreateInput` object suitable for Prisma operations.
 */
export function convertMessageOpenAPIToPrisma(
  message: MessageType
): MessageCreateInput {
  const _message = {
    content: message.content,
    sentAt: new Date(message.sentAt),
    inquiry: { connect: { id: message.inquiry_id } },
    sender: { connect: { id: message.sender_id } },
  };
  return _message;
}

export class InquiryService {
  /**
   * Retrieves inquiries for a specific request and entity, including their messages.
   *
   * @param requestId - The ID of the request to filter inquiries by.
   * @param entityId - The ID of the entity to filter inquiries by (matches either entityA_id or entityB_id).
   * @returns A promise that resolves to an array of inquiries with their messages.
   */
  async getInquiries(requestId: number, entityId: number) {
    try {
      // Validate required parameters
      if (!entityId) {
        logWithOperation(
          'warn',
          'Entity ID is required for inquiry retrieval',
          null,
          {
            requestId: sanitizeForLogs(requestId.toString()),
          }
        );
        throw new Error('Entity ID is required for inquiry retrieval');
      }

      const inquiries = await prisma.inquiry.findMany({
        where: {
          OR: [{ entityA_id: entityId }, { entityB_id: entityId }],
          request_id: requestId,
        },
        include: {
          entityA: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
              type: true,
              active: true,
            },
          },
          entityB: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
              type: true,
              active: true,
            },
          },
          messages: {
            select: {
              id: true,
              inquiry_id: true,
              sender: {
                select: {
                  id: true,
                  name: true,
                  entity: {
                    select: {
                      id: true,
                      abbreviation: true,
                    },
                  },
                },
              },
              content: true,
              sentAt: true,
            },
            orderBy: {
              //timestamp: 'asc',
            },
          },
        },
      });
      return inquiries;
    } catch (error) {
      logError('Error fetching inquiries', error as Error, {
        operation: 'getInquiries',
        component: 'inquiries_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching inquiries');
    }
  }

  /**
   * Creates a new inquiry in the database.
   *
   * Converts the provided inquiry object from the OpenAPI format to the Prisma format,
   * then creates a new inquiry record including its messages.
   *
   * @param inquiry - The inquiry data to create, in OpenAPI format.
   * @returns A promise that resolves to the created inquiry model, including its messages.
   */
  async create(inquiry: InquiryType): Promise<InquiryWithMessages> {
    try {
      const prismaData = convertInquiryOpenAPIToPrisma(inquiry);
      return await prisma.inquiry.create({
        data: prismaData as InquiryCreateInput,
        include: {
          messages: true,
        },
      });
    } catch (error) {
      logError('Error creating inquiry', error as Error, {
        operation: 'create',
        component: 'inquiries_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error creating inquiry');
    }
  }

  /**
   * Updates an existing inquiry in the database with the provided updates.
   *
   * @param id - The unique identifier of the inquiry to update.
   * @param updates - A partial object containing the fields to update on the inquiry.
   * @returns A promise that resolves to the updated InquiryModel if successful, or null if an error occurs.
   */
  async updateInquiry(
    id: number,
    updates: Partial<InquiryType>
  ): Promise<InquiryModel | null> {
    try {
      const prismaUpdates = convertInquiryOpenAPIToPrisma(updates, 'update');
      const updated = await prisma.inquiry.update({
        where: { id },
        data: prismaUpdates,
      });
      return updated;
    } catch (error) {
      logError('Error updating inquiry', error as Error, {
        operation: 'updateInquiry',
        component: 'inquiries_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      return null;
    }
  }

  /**
   * Retrieves a inquiry by its unique identifier, including its messages ordered by sent date (descending).
   *
   * @param id - The unique identifier of the inquiry to retrieve.
   * @param requestId - The unique identifier of the request Id to retrieve.
   * @returns A promise that resolves to the inquiry object in OpenAPI format, or `null` if not found.
   */
  async getInquiryById(
    requestId: number,
    id: number
  ): Promise<InquiryType | null> {
    try {
      const inquiry = await prisma.inquiry.findUnique({
        where: { id, request_id: requestId },
        include: {
          entityA: {
            select: {
              name: true,
              abbreviation: true,
              type: true,
            },
          },
          entityB: {
            select: {
              name: true,
              abbreviation: true,
              type: true,
            },
          },
          messages: {
            include: {
              sender: {
                select: {
                  id: true,
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
            orderBy: { sentAt: 'desc' },
          },
        },
      });
      if (!inquiry) {
        logWithOperation('warn', 'Inquiry not found', null, {
          inquiryId: id,
        });
        return null;
      }
      return convertInquiryPrismaToOpenAPI(inquiry);
    } catch (error) {
      logError('Error fetching inquiry', error as Error, {
        operation: 'getInquiryById',
        component: 'inquiries_services',
        additionalData: {
          inquiryId: sanitizeForLogs(id.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching inquiry');
    }
  }

  /**
   * Creates a new message in the database.
   *
   * @param message - The message object to be created, conforming to the `MessageType` interface.
   * @returns A promise that resolves to the created message object.
   */
  async createMessage(message: MessageType) {
    try {
      // Validate required parameters
      if (!message.sender_id) {
        logWithOperation(
          'warn',
          'Sender ID is required for message creation',
          null,
          {
            inquiryId: sanitizeForLogs(
              message.inquiry_id?.toString() || 'unknown'
            ),
          }
        );
        throw new Error('Sender ID is required for message creation');
      }

      const prismaData = convertMessageOpenAPIToPrisma(message);
      const _message = await prisma.message.create({
        data: prismaData,
        include: {
          sender: {
            select: {
              id: true,
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
      return _message;
    } catch (error) {
      logError('Error creating message', error as Error, {
        operation: 'createMessage',
        component: 'inquiries_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching inquiry');
    }
  }
}
