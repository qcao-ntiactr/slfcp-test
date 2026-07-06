import {
  CommonCondition,
  CommonConditionStatus,
  Prisma,
  User,
} from '@prisma/client';

import prisma from '../utils/database.js';
import { sanitizeForLogs } from '../utils/sanitize.js';
import { logError } from '../utils/structuredLogger.js';

export type CommonConditionActorRole = 'NTIA' | 'FEDERAL_AGENCY' | 'COMMERCIAL';

export type CommonConditionListItem = {
  id: number;
  title: string;
  content: string;
  status: CommonConditionStatus;
  createdAt: string;
  publishedAt: string | null;
  submittedBy: string | null;
  isOwnedByCurrentUser: boolean;
  rejectionReason: string | null;
};

export type CommonConditionOptionsItem = {
  id: number;
  title: string;
  content: string;
  sortOrder: number;
};

export type PaginatedCommonConditionsResponse = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  data: CommonConditionListItem[];
};

export type CommonConditionMutationInput = {
  title: string;
  content: string;
};

type CommonConditionRejectInput = {
  rejectionReason: string;
};

type CommonConditionActor = Pick<User, 'id' | 'email'> & {
  role: CommonConditionActorRole;
};

type CommonConditionWithUsers = CommonCondition & {
  created_by: Pick<User, 'id' | 'email'> | null;
};

const ntiaDeletableStatuses: CommonConditionStatus[] = [
  'PUBLISHED',
  'REJECTED',
];
const federalDeletableStatuses: CommonConditionStatus[] = ['DRAFT'];

class CommonConditionServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'CommonConditionServiceError';
    this.statusCode = statusCode;
  }
}

const commonConditionListInclude = {
  created_by: {
    select: {
      id: true,
      email: true,
    },
  },
} satisfies Prisma.CommonConditionInclude;

const nonPublishedWorkflowStatuses: CommonConditionStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'REJECTED',
];

const ntiaWorkflowStatuses: CommonConditionStatus[] = ['SUBMITTED', 'REJECTED'];

export function getWorkflowStatusesForActor(
  role: CommonConditionActorRole
): CommonConditionStatus[] {
  return role === 'NTIA' ? ntiaWorkflowStatuses : nonPublishedWorkflowStatuses;
}

function toListItem(
  commonCondition: CommonConditionWithUsers,
  actor?: Pick<CommonConditionActor, 'id'>
): CommonConditionListItem {
  return {
    id: commonCondition.id,
    title: commonCondition.title,
    content: commonCondition.content,
    status: commonCondition.status,
    createdAt: commonCondition.createdAt.toISOString(),
    publishedAt: commonCondition.publishedAt?.toISOString() ?? null,
    submittedBy: commonCondition.created_by?.email ?? null,
    isOwnedByCurrentUser:
      actor !== undefined && commonCondition.created_by_id === actor.id,
    rejectionReason: commonCondition.rejection_reason ?? null,
  };
}

function ensureValidStatusFilter(
  statuses?: string[],
  allowedStatuses?: CommonConditionStatus[]
): CommonConditionStatus[] | undefined {
  if (!statuses?.length) {
    return undefined;
  }

  const filtered = statuses.filter((status): status is CommonConditionStatus =>
    Object.values(CommonConditionStatus).includes(
      status as CommonConditionStatus
    )
  );

  if (!allowedStatuses?.length) {
    return filtered.length ? filtered : undefined;
  }

  const allowedStatusSet = new Set(allowedStatuses);
  const allowedFiltered = filtered.filter((status) =>
    allowedStatusSet.has(status)
  );

  return allowedFiltered.length ? allowedFiltered : undefined;
}

function getTotalPages(totalCount: number, pageSize: number) {
  return totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
}

export function isCommonConditionServiceError(
  error: unknown
): error is CommonConditionServiceError {
  return error instanceof CommonConditionServiceError;
}

export class CommonConditionsService {
  private async getConditionOrThrow(id: number) {
    const commonCondition = await prisma.commonCondition.findUnique({
      where: { id },
      include: commonConditionListInclude,
    });

    if (!commonCondition) {
      throw new CommonConditionServiceError('Common condition not found', 404);
    }

    return commonCondition;
  }

  private assertIsOwner(
    commonCondition: Pick<CommonCondition, 'created_by_id'>,
    actor: CommonConditionActor
  ) {
    if (commonCondition.created_by_id !== actor.id) {
      throw new CommonConditionServiceError('Access denied for user', 403);
    }
  }

  private assertStatus(
    commonCondition: Pick<CommonCondition, 'status'>,
    expectedStatus: CommonConditionStatus,
    message: string
  ) {
    if (commonCondition.status !== expectedStatus) {
      throw new CommonConditionServiceError(message, 409);
    }
  }

  async getPublishedOptions(): Promise<CommonConditionOptionsItem[]> {
    try {
      const commonConditions = await prisma.commonCondition.findMany({
        where: {
          status: 'PUBLISHED',
        },
        orderBy: [{ sort_order: 'asc' }, { title: 'asc' }],
      });

      return commonConditions.map((commonCondition) => ({
        id: commonCondition.id,
        title: commonCondition.title,
        content: commonCondition.content,
        sortOrder: commonCondition.sort_order,
      }));
    } catch (error) {
      logError('Error fetching published common condition options', error, {
        operation: 'getPublishedOptions',
        component: 'common_conditions_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  async getPublishedCommonConditions(
    page: number,
    pageSize: number,
    actor?: CommonConditionActor
  ): Promise<PaginatedCommonConditionsResponse> {
    try {
      const where: Prisma.CommonConditionWhereInput = {
        status: 'PUBLISHED',
      };

      const [data, totalCount] = await prisma.$transaction([
        prisma.commonCondition.findMany({
          where,
          include: commonConditionListInclude,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
        prisma.commonCondition.count({ where }),
      ]);

      return {
        page,
        pageSize,
        totalCount,
        totalPages: getTotalPages(totalCount, pageSize),
        data: data.map((commonCondition) =>
          toListItem(commonCondition as CommonConditionWithUsers, actor)
        ),
      };
    } catch (error) {
      logError('Error fetching published common conditions', error, {
        operation: 'getPublishedCommonConditions',
        component: 'common_conditions_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  async getWorkflowCommonConditions(
    page: number,
    pageSize: number,
    actor: CommonConditionActor,
    statuses?: string[]
  ): Promise<PaginatedCommonConditionsResponse> {
    try {
      const allowedStatuses = getWorkflowStatusesForActor(actor.role);
      const statusFilter = ensureValidStatusFilter(statuses, allowedStatuses);
      const where: Prisma.CommonConditionWhereInput = {
        status: {
          in: statusFilter ?? allowedStatuses,
        },
      };

      if (actor.role === 'FEDERAL_AGENCY') {
        where.created_by_id = actor.id;
      }

      const [data, totalCount] = await prisma.$transaction([
        prisma.commonCondition.findMany({
          where,
          include: commonConditionListInclude,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
        prisma.commonCondition.count({ where }),
      ]);

      return {
        page,
        pageSize,
        totalCount,
        totalPages: getTotalPages(totalCount, pageSize),
        data: data.map((commonCondition) =>
          toListItem(commonCondition as CommonConditionWithUsers, actor)
        ),
      };
    } catch (error) {
      logError('Error fetching workflow common conditions', error, {
        operation: 'getWorkflowCommonConditions',
        component: 'common_conditions_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  async createDraft(
    commonCondition: CommonConditionMutationInput,
    actor: CommonConditionActor
  ) {
    try {
      const isNtia = actor.role === 'NTIA';
      const publishedAt = isNtia ? new Date() : null;
      const highestSortOrder = isNtia
        ? await prisma.commonCondition.aggregate({
            where: {
              status: 'PUBLISHED',
            },
            _max: {
              sort_order: true,
            },
          })
        : null;

      return await prisma.commonCondition.create({
        data: {
          title: commonCondition.title,
          content: commonCondition.content,
          status: isNtia ? 'PUBLISHED' : 'DRAFT',
          created_by_id: actor.id,
          approved_by_id: isNtia ? actor.id : null,
          sort_order: isNtia
            ? (highestSortOrder?._max.sort_order ?? -1) + 1
            : 0,
          createdAt: publishedAt ?? undefined,
          publishedAt,
        },
      });
    } catch (error) {
      logError('Error creating common condition draft', error, {
        operation: 'createDraft',
        component: 'common_conditions_services',
        additionalData: {
          actorId: sanitizeForLogs(String(actor.id)),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  async submitDraft(id: number, actor: CommonConditionActor) {
    try {
      const commonCondition = await this.getConditionOrThrow(id);
      this.assertStatus(
        commonCondition,
        'DRAFT',
        'Only drafts can be submitted'
      );

      if (actor.role !== 'NTIA') {
        this.assertIsOwner(commonCondition, actor);
      }

      return await prisma.commonCondition.update({
        where: { id },
        data: {
          status: 'SUBMITTED',
        },
      });
    } catch (error) {
      logError('Error submitting common condition draft', error, {
        operation: 'submitDraft',
        component: 'common_conditions_services',
        additionalData: {
          commonConditionId: sanitizeForLogs(String(id)),
          actorId: sanitizeForLogs(String(actor.id)),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  async updateDraft(
    id: number,
    commonCondition: CommonConditionMutationInput,
    actor: CommonConditionActor
  ) {
    try {
      const existingCommonCondition = await this.getConditionOrThrow(id);
      this.assertStatus(
        existingCommonCondition,
        'DRAFT',
        'Only drafts can be edited'
      );
      if (actor.role !== 'NTIA') {
        this.assertIsOwner(existingCommonCondition, actor);
      }

      return await prisma.commonCondition.update({
        where: { id },
        data: {
          title: commonCondition.title,
          content: commonCondition.content,
        },
      });
    } catch (error) {
      logError('Error updating common condition draft', error, {
        operation: 'updateDraft',
        component: 'common_conditions_services',
        additionalData: {
          commonConditionId: sanitizeForLogs(String(id)),
          actorId: sanitizeForLogs(String(actor.id)),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  async publishSubmittedCondition(id: number, actor: CommonConditionActor) {
    try {
      const commonCondition = await this.getConditionOrThrow(id);
      this.assertStatus(
        commonCondition,
        'SUBMITTED',
        'Only submitted conditions can be published'
      );

      const highestSortOrder = await prisma.commonCondition.aggregate({
        where: {
          status: 'PUBLISHED',
        },
        _max: {
          sort_order: true,
        },
      });

      return await prisma.commonCondition.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          sort_order: (highestSortOrder._max.sort_order ?? -1) + 1,
          approved_by_id: actor.id,
          publishedAt: new Date(),
          rejection_reason: null,
        },
      });
    } catch (error) {
      logError('Error publishing common condition', error, {
        operation: 'publishSubmittedCondition',
        component: 'common_conditions_services',
        additionalData: {
          commonConditionId: sanitizeForLogs(String(id)),
          actorId: sanitizeForLogs(String(actor.id)),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  async rejectSubmittedCondition(
    id: number,
    input: CommonConditionRejectInput
  ) {
    try {
      const commonCondition = await this.getConditionOrThrow(id);
      this.assertStatus(
        commonCondition,
        'SUBMITTED',
        'Only submitted conditions can be rejected'
      );

      return await prisma.commonCondition.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejection_reason: input.rejectionReason,
        },
      });
    } catch (error) {
      logError('Error rejecting common condition', error, {
        operation: 'rejectSubmittedCondition',
        component: 'common_conditions_services',
        additionalData: {
          commonConditionId: sanitizeForLogs(String(id)),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  async deleteCondition(id: number, actor: CommonConditionActor) {
    try {
      const commonCondition = await this.getConditionOrThrow(id);
      const allowedStatuses =
        actor.role === 'NTIA'
          ? ntiaDeletableStatuses
          : federalDeletableStatuses;

      if (!allowedStatuses.includes(commonCondition.status)) {
        throw new CommonConditionServiceError(
          actor.role === 'NTIA'
            ? 'Only final-stage approved or denied conditions can be deleted'
            : 'Only draft conditions can be deleted',
          409
        );
      }

      if (actor.role !== 'NTIA') {
        this.assertIsOwner(commonCondition, actor);
      }

      await prisma.commonCondition.delete({
        where: { id },
      });
    } catch (error) {
      logError('Error deleting common condition', error, {
        operation: 'deleteCondition',
        component: 'common_conditions_services',
        additionalData: {
          commonConditionId: sanitizeForLogs(String(id)),
          actorId: sanitizeForLogs(String(actor.id)),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }
}
