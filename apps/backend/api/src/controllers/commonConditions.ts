import { CommonConditionStatus } from '@prisma/client';
import { Request, Response } from 'express';

import {
  CommonConditionActorRole,
  CommonConditionsService,
  isCommonConditionServiceError,
} from '../services/commonConditions.js';
import { getAuthenticatedUser } from '../utils/userExtraction.js';
import { sanitizeForLogs } from '../utils/sanitize.js';
import {
  logError,
  logWithOperation,
  OperationType,
} from '../utils/structuredLogger.js';

type CommonConditionPayload = {
  title: string;
  content: string;
};

type CommonConditionPayloadInput = {
  title?: string;
  content?: string;
};

type RejectCommonConditionPayload = {
  rejectionReason: string;
};

type RejectCommonConditionPayloadInput = {
  rejectionReason?: string;
};

type CommonConditionListQuery = {
  page?: string;
  pageSize?: string;
  statuses?: string | string[];
};

type CommonConditionIdParams = {
  id: string;
};

type CommonConditionMutationRequest = Request<
  CommonConditionIdParams,
  unknown,
  CommonConditionPayloadInput
>;

type CommonConditionRejectRequest = Request<
  CommonConditionIdParams,
  unknown,
  RejectCommonConditionPayloadInput
>;

type CommonConditionListRequest = Request<
  Record<string, never>,
  Record<string, never>,
  unknown,
  CommonConditionListQuery
>;

const isCommonConditionActorRole = (
  role: string | undefined
): role is CommonConditionActorRole =>
  role === 'NTIA' || role === 'FEDERAL_AGENCY' || role === 'COMMERCIAL';

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const parsePositiveInteger = (
  value: string | undefined,
  defaultValue: number
): number => {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
};

const isNonPublishedWorkflowStatus = (
  status: string
): status is CommonConditionStatus =>
  status === 'DRAFT' || status === 'SUBMITTED' || status === 'REJECTED';

const validateCommonConditionPayload = (
  payload: CommonConditionPayloadInput
): { data?: CommonConditionPayload; error?: string } => {
  const { title, content } = payload;

  if (typeof title !== 'string' || !title.trim()) {
    return {
      error: 'title is required and must be a non-empty string',
    };
  }

  if (typeof content !== 'string' || !content.trim()) {
    return {
      error: 'content is required and must be a non-empty string',
    };
  }

  return {
    data: {
      title: title.trim(),
      content: content.trim(),
    },
  };
};

const validateRejectPayload = (
  payload: RejectCommonConditionPayloadInput
): { data?: RejectCommonConditionPayload; error?: string } => {
  const { rejectionReason } = payload;

  if (
    typeof rejectionReason !== 'string' ||
    rejectionReason.trim().length === 0
  ) {
    return {
      error: 'rejectionReason is required and must be a non-empty string',
    };
  }

  return {
    data: {
      rejectionReason: rejectionReason.trim(),
    },
  };
};

const parseId = (
  req: Request<CommonConditionIdParams>,
  res: Response
): number | null => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid common condition ID' });
    return null;
  }

  return id;
};

const parsePagination = (query: CommonConditionListQuery) => {
  return {
    page: parsePositiveInteger(query.page, 1),
    pageSize: parsePositiveInteger(query.pageSize, 10),
  };
};

const parseWorkflowStatuses = (
  query: CommonConditionListQuery
): CommonConditionStatus[] | undefined => {
  const rawStatuses = query.statuses;
  const statuses = Array.isArray(rawStatuses)
    ? rawStatuses
    : typeof rawStatuses === 'string'
      ? [rawStatuses]
      : undefined;

  const filteredStatuses = statuses?.filter(isNonPublishedWorkflowStatus);
  return filteredStatuses?.length ? filteredStatuses : undefined;
};

const handleCommonConditionError = (
  req: Request,
  res: Response,
  error: unknown,
  operation: string
) => {
  if (isCommonConditionServiceError(error)) {
    logWithOperation('warn', 'Common condition service error', req, {
      error: error.message,
    });
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  logError(`Error in ${operation}`, toError(error), {
    operation,
    component: 'common_conditions_controller',
    operationType: OperationType.HTTP_REQUEST,
    httpStatusCode: 500,
  });
  res.status(500).json({ error: 'Internal Server Error' });
};

async function getActor(req: Request) {
  const user = await getAuthenticatedUser(req);
  const role = req.user?.role;

  if (!isCommonConditionActorRole(role)) {
    logWithOperation('warn', 'Invalid user role for common conditions', req, {
      error: 'User role missing or invalid for common conditions',
    });
    throw new Error('User role missing or invalid for common conditions');
  }

  return {
    id: user.id,
    email: user.email,
    role,
  };
}

export const getCommonConditionOptions = async (
  req: Request,
  res: Response
) => {
  try {
    const commonConditions =
      await new CommonConditionsService().getPublishedOptions();

    logWithOperation('info', 'Retrieved common condition options', req, {
      count: commonConditions.length,
    });
    res.status(200).json(commonConditions);
  } catch (error) {
    handleCommonConditionError(req, res, error, 'getCommonConditionOptions');
  }
};

export const getPublishedCommonConditions = async (
  req: CommonConditionListRequest,
  res: Response
) => {
  try {
    const { page, pageSize } = parsePagination(req.query);
    const actor = await getActor(req);
    const commonConditions =
      await new CommonConditionsService().getPublishedCommonConditions(
        page,
        pageSize,
        actor
      );

    logWithOperation('info', 'Retrieved published common conditions', req, {
      page,
      pageSize,
      totalCount: commonConditions.totalCount,
    });
    res.status(200).json(commonConditions);
  } catch (error) {
    handleCommonConditionError(req, res, error, 'getPublishedCommonConditions');
  }
};

export const getSubmittedCommonConditions = async (
  req: CommonConditionListRequest,
  res: Response
) => {
  try {
    const { page, pageSize } = parsePagination(req.query);
    const actor = await getActor(req);
    const statuses = parseWorkflowStatuses(req.query);

    const commonConditions =
      await new CommonConditionsService().getWorkflowCommonConditions(
        page,
        pageSize,
        actor,
        statuses
      );

    logWithOperation('info', 'Retrieved submitted common conditions', req, {
      page,
      pageSize,
      totalCount: commonConditions.totalCount,
      requestedStatuses: sanitizeForLogs(JSON.stringify(statuses ?? [])),
    });
    res.status(200).json(commonConditions);
  } catch (error) {
    handleCommonConditionError(req, res, error, 'getSubmittedCommonConditions');
  }
};

export const createCommonConditionDraft = async (
  req: Request<
    Record<string, never>,
    Record<string, never>,
    CommonConditionPayloadInput
  >,
  res: Response
) => {
  const validation = validateCommonConditionPayload(req.body);
  if (validation.error || !validation.data) {
    logWithOperation('warn', 'Validation failed', req, {
      error: validation.error,
    });
    res.status(400).json({
      error: validation.error || 'Invalid request payload',
    });
    return;
  }

  try {
    const actor = await getActor(req);
    const commonCondition = await new CommonConditionsService().createDraft(
      validation.data,
      actor
    );

    logWithOperation('info', 'Created common condition draft', req, {
      commonConditionId: commonCondition.id,
    });
    res.status(201).json(commonCondition);
  } catch (error) {
    handleCommonConditionError(req, res, error, 'createCommonConditionDraft');
  }
};

export const submitCommonConditionDraft = async (
  req: Request<CommonConditionIdParams>,
  res: Response
) => {
  const id = parseId(req, res);
  if (!id) return;

  try {
    const actor = await getActor(req);
    const commonCondition = await new CommonConditionsService().submitDraft(
      id,
      actor
    );

    logWithOperation('info', 'Submitted common condition draft', req, {
      commonConditionId: commonCondition.id,
    });
    res.status(200).json(commonCondition);
  } catch (error) {
    handleCommonConditionError(req, res, error, 'submitCommonConditionDraft');
  }
};

export const updateCommonCondition = async (
  req: CommonConditionMutationRequest,
  res: Response
) => {
  const id = parseId(req, res);
  if (!id) return;

  const validation = validateCommonConditionPayload(req.body);
  if (validation.error || !validation.data) {
    logWithOperation('warn', 'Validation failed', req, {
      error: validation.error,
    });
    res.status(400).json({
      error: validation.error || 'Invalid request payload',
    });
    return;
  }

  try {
    const actor = await getActor(req);
    const updated = await new CommonConditionsService().updateDraft(
      id,
      validation.data,
      actor
    );

    logWithOperation('info', 'Updated common condition draft', req, {
      commonConditionId: id,
      actorId: actor.id,
      actorRole: actor.role,
    });
    res.status(200).json(updated);
  } catch (error) {
    handleCommonConditionError(req, res, error, 'updateCommonCondition');
  }
};

export const publishCommonCondition = async (
  req: Request<CommonConditionIdParams>,
  res: Response
) => {
  const id = parseId(req, res);
  if (!id) return;

  try {
    const actor = await getActor(req);
    const published =
      await new CommonConditionsService().publishSubmittedCondition(id, actor);

    logWithOperation('info', 'Published common condition', req, {
      commonConditionId: id,
      actorId: actor.id,
      actorRole: actor.role,
    });
    res.status(200).json(published);
  } catch (error) {
    handleCommonConditionError(req, res, error, 'publishCommonCondition');
  }
};

export const rejectCommonCondition = async (
  req: CommonConditionRejectRequest,
  res: Response
) => {
  const id = parseId(req, res);
  if (!id) return;

  const validation = validateRejectPayload(req.body);
  if (validation.error || !validation.data) {
    logWithOperation('warn', 'Validation failed', req, {
      error: validation.error,
    });
    res.status(400).json({
      error: validation.error || 'Invalid request payload',
    });
    return;
  }

  try {
    const actor = await getActor(req);
    const rejected =
      await new CommonConditionsService().rejectSubmittedCondition(
        id,
        validation.data
      );

    logWithOperation('info', 'Rejected common condition', req, {
      commonConditionId: id,
      actorId: actor.id,
      actorRole: actor.role,
    });
    res.status(200).json(rejected);
  } catch (error) {
    handleCommonConditionError(req, res, error, 'rejectCommonCondition');
  }
};

export const deleteCommonCondition = async (
  req: Request<CommonConditionIdParams>,
  res: Response
) => {
  const id = parseId(req, res);
  if (!id) return;

  try {
    const actor = await getActor(req);
    await new CommonConditionsService().deleteCondition(id, actor);

    logWithOperation('info', 'Deleted common condition', req, {
      commonConditionId: id,
      actorId: actor.id,
      actorRole: actor.role,
    });
    res.status(204).send();
  } catch (error) {
    handleCommonConditionError(req, res, error, 'deleteCommonCondition');
  }
};
