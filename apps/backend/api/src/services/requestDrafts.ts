import { components } from '../types/requests.js';
import prisma from '../utils/database.js';
import { safeParseJSON } from '../utils/safeParse.js';
import { sanitizeForLogs } from '../utils/sanitize.js';
import { logError } from '../utils/structuredLogger.js';
import { normalizeNullableDateTime } from '../utils/normalizeNullableDateTime.js';

import { UsersService } from './users.js';

// OpenAPI-generated types
export type RequestDraftType = components['schemas']['RequestDraft'];
export type FrequencyType = components['schemas']['FrequencyDraft'];
export type ReceiverType = components['schemas']['Receiver'];

// Input type (OpenAPI request + frequencies)
type RequestDraftInput = RequestDraftType & {
  frequencies?: Omit<FrequencyType, 'id' | 'request_draft_id'>[]; // remove fields Prisma doesn't need
};

// Type for Prisma operations with user relationship
const requestDraftWithUser = {
  include: {
    frequencies: true,
    user: {
      include: {
        entity: true,
      },
    },
  },
};

const normalizeReceivers = (receivers: unknown): ReceiverType[] => {
  if (Array.isArray(receivers)) {
    return receivers as ReceiverType[];
  }

  if (receivers && typeof receivers === 'object') {
    return receivers as ReceiverType[];
  }

  if (typeof receivers === 'string') {
    const parsed = safeParseJSON<ReceiverType[] | ReceiverType>(receivers);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && typeof parsed === 'object') {
      return [parsed];
    }
  }

  return [];
};

export class RequestDraftService {
  /**
   * Validates that only COMMERCIAL users can create or update request drafts.
   */
  public async validateUserCanModifyRequestDrafts(
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

    // Only COMMERCIAL users can create or update request drafts
    if (user.entity.type !== 'COMMERCIAL') {
      throw new Error(
        'Only COMMERCIAL users can create or update request drafts'
      );
    }
  }

  /**
   * Validates user access to view request drafts based on their entity type.
   * - COMMERCIAL users can only view request drafts created by themselves
   * - NTIA and FEDERAL_AGENCY users can view all request drafts
   */
  public async validateUserCanViewRequestDraft(
    userId: number,
    draftId: number
  ): Promise<void> {
    // Get the user with their entity information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { entity: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // NTIA and FEDERAL_AGENCY users can view all request drafts
    if (user.entity.type === 'NTIA' || user.entity.type === 'FEDERAL_AGENCY') {
      return;
    }

    // COMMERCIAL users can only view request drafts from themselves
    if (user.entity.type === 'COMMERCIAL') {
      // Get the request draft with the user who created it and their entity
      const draft = await prisma.requestDraft.findUnique({
        where: { id: draftId },
        include: {
          user: {
            include: { entity: true },
          },
        },
      });

      if (!draft) {
        throw new Error('Request draft not found');
      }

      // Check if the draft was created by the same user
      if (draft.user?.id !== user.id) {
        throw new Error(
          'Users can only view request drafts created by themselves'
        );
      }
    }
  }

  /**
   * Retrieves all request drafts from the database with pagination support.
   * For COMMERCIAL users, filters to show only drafts from themselves.
   * - COMMERCIAL users can only view request drafts created by themselves
   * - NTIA and FEDERAL_AGENCY users can view all request drafts
   */
  async getRequestDrafts(page: number, pageSize: number, userId: number) {
    try {
      let whereClause = {};

      // Apply entity-based filtering based on entity type
      const userWithEntity = await prisma.user.findUnique({
        where: { id: userId },
        include: { entity: true },
      });

      if (userWithEntity && userWithEntity.entity.type === 'COMMERCIAL') {
        // COMMERCIAL users can only see request drafts from themselves
        whereClause = {
          user_id: userId,
        };
      }
      // NTIA and FEDERAL_AGENCY users can see all request drafts (no additional filter needed)

      const [data, count] = await prisma.$transaction([
        prisma.requestDraft.findMany({
          where: whereClause,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          ...requestDraftWithUser,
        }),
        prisma.requestDraft.count({ where: whereClause }),
      ]);

      return {
        page,
        pageSize,
        data: data,
        totalCount: count,
      };
    } catch (error) {
      logError('Error fetching request drafts', error as Error, {
        operation: 'getRequestDrafts',
        component: 'requestDrafts_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Error fetching request drafts');
    }
  }

  /**
   * Create a request draft with optional frequency draft array (each containing an array with one or more receivers).
   *
   * @param userId - User ID creating the request draft
   * @param data - Request draft input object
   * @returns Created request draft with associated frequencies and user information
   */
  async createRequestDraft(userId: number, data: RequestDraftInput) {
    const { frequencies = [], ...draftData } = data;

    const {
      ecf_cartesian_vectors_format_file, // eslint-disable-line @typescript-eslint/no-unused-vars
      ground_track_of_launch_vehicle_2d_img_file, // eslint-disable-line @typescript-eslint/no-unused-vars
      fcc_filing_date,
      ...prismaReadyData
    } = draftData;
    const normalizedFccFilingDate = normalizeNullableDateTime(fcc_filing_date);

    try {
      const created = await prisma.requestDraft.create({
        data: {
          ...prismaReadyData,
          ...(normalizedFccFilingDate !== undefined && {
            fcc_filing_date: normalizedFccFilingDate,
          }),
          ...(userId && { user_id: userId }),
          frequencies: {
            create: frequencies.map((freq) => ({
              ...freq,
              receivers: (freq.receivers as ReceiverType[]) ?? null,
            })),
          },
        },
      });

      // Fetch full draft with frequencies and user
      const createdDraft = await prisma.requestDraft.findUnique({
        where: { id: created.id },
        ...requestDraftWithUser,
      });

      if (!createdDraft) {
        throw new Error('Failed to retrieve created draft');
      }

      return {
        ...createdDraft,
        frequencies: createdDraft.frequencies.map((freq) => {
          return {
            ...freq,
            receivers: normalizeReceivers(freq.receivers),
          };
        }),
      };
    } catch (error) {
      logError('Failed to create request draft', error as Error, {
        operation: 'createRequestDraft',
        component: 'requestDrafts_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Failed to create request draft');
    }
  }

  /**
   * Retrieve a request draft by ID
   * Only COMMERCIAL users can view request drafts and only created by them.
   */
  async getRequestDraftById(id: number) {
    const draft = await prisma.requestDraft.findUnique({
      where: { id },
      ...requestDraftWithUser,
    });

    if (!draft) {
      throw new Error('Request draft not found');
    }

    return {
      ...draft,
      frequencies: draft.frequencies.map((freq) => {
        return {
          ...freq,
          receivers: normalizeReceivers(freq.receivers),
        };
      }),
    };
  }

  /**
   * Delete a request draft by ID
   * Only COMMERCIAL users can delete request drafts from their own entity.
   */
  async deleteRequestDraftById(id: number) {
    const existing = await prisma.requestDraft.findUnique({ where: { id } });

    if (!existing) {
      const err = new Error('Request Draft not found');
      err.name = 'NotFound';
      throw err;
    }

    try {
      await prisma.requestDraft.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      logError('Failed to delete request draft', error as Error, {
        operation: 'deleteRequestDraftById',
        component: 'requestDrafts_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Failed to delete request draft');
    }
  }
  /**
   * Update a request draft by ID
   * Only COMMERCIAL users can update request drafts from their own entity.
   */
  async updateRequestDraftById(
    id: number,
    userId: number,
    data: Partial<RequestDraftInput>
  ) {
    const {
      frequencies,
      user_id, // eslint-disable-line @typescript-eslint/no-unused-vars
      ecf_cartesian_vectors_format_file, // eslint-disable-line @typescript-eslint/no-unused-vars
      ground_track_of_launch_vehicle_2d_img_file, // eslint-disable-line @typescript-eslint/no-unused-vars
      fcc_filing_date,
      ...prismaReadyData
    } = data;
    const normalizedFccFilingDate = normalizeNullableDateTime(fcc_filing_date);

    try {
      // If frequencies are provided, delete and replace them
      if (frequencies) {
        await prisma.frequencyDraft.deleteMany({
          where: { request_draft_id: id },
        });

        await prisma.frequencyDraft.createMany({
          data: frequencies.map((freq) => ({
            ...freq,
            request_draft_id: id,
            receivers: (freq.receivers as ReceiverType[]) ?? null,
          })),
        });
      }

      // Update the main draft
      await prisma.requestDraft.update({
        where: { id },
        data: {
          ...prismaReadyData,
          ...(normalizedFccFilingDate !== undefined && {
            fcc_filing_date: normalizedFccFilingDate,
          }),
          ...(userId !== undefined && { user_id: userId }),
        },
      });

      // Return full updated draft with user info
      const updatedDraft = await prisma.requestDraft.findUnique({
        where: { id },
        ...requestDraftWithUser,
      });

      if (!updatedDraft) {
        throw new Error('Failed to retrieve updated draft');
      }

      // Convert to include external user ID
      const externalUserId = updatedDraft.user_id
        ? await new UsersService().getUserExternalId(updatedDraft.user_id)
        : null;

      return {
        ...updatedDraft,
        frequencies: updatedDraft.frequencies.map((freq) => {
          return {
            ...freq,
            receivers: normalizeReceivers(freq.receivers),
          };
        }),
        user_id: externalUserId ?? '',
      };
    } catch (error) {
      logError('Failed to update request draft', error as Error, {
        operation: 'updateRequestDraftById',
        component: 'requestDrafts_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw new Error('Failed to update request draft');
    }
  }
}
