import { Request, Response, Express, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { subBusinessDays, differenceInCalendarDays } from 'date-fns';
import { portalFormSchemaExtended } from '@slfcp/validation';
import { BlobServiceClient } from '@azure/storage-blob';

import { sanitizeForLogs } from '../utils/sanitize.js';
import { formatRequestId } from '../utils/formatters.js';
import {
  logDatabaseOperation,
  logBusinessEvent,
  logValidation,
  logError,
  logWorkflowEvent,
  logPerformance,
  logWithOperation,
  logAuthEvent,
  OperationType,
} from '../utils/structuredLogger.js';
import {
  getAuthenticatedUser,
  extractAndOverrideUserId,
} from '../utils/userExtraction.js';
import {
  convertInquiryPrismaToOpenAPI,
  InquiryService,
  InquiryType,
  MessageType,
} from '../services/inquiries.js';
import { UsersService } from '../services/users.js';
import { MessageReadStatusService } from '../services/messageReadStatus.js';
import { FrequencyType, ReceiverType } from '../services/requestDrafts.js';
import { UsersController } from '../controllers/users.js';
import { accessInquiry } from '../access/accessInquiry.js';

import {
  azureBlobStorageConnectionString,
  azureBlobContainerName,
  ntiaAutoApprovalUserId,
} from './../config.js';
import {
  convertRequestPrismaToOpenAPI,
  RequestService,
  RequestType,
  RequestTypePrisma,
  RequestDetails,
  StatusEnum,
} from './../services/requests.js';
import {
  parseRequestFilterRules,
  parseRequestSortDirection,
  parseRequestSortKey,
  RequestListQueryError,
} from './../services/requestListQuery.js';
import { FrequencyRangeService } from './../services/frequencyranges.js';
import { FederalAgencyService } from './../services/federalAgencies.js';
import { EntityService, EntityEnum } from './../services/entities.js';
import { ApprovalService, ApprovalType } from './../services/approvals.js';
import { DenialService, DenialType } from './../services/denials.js';
import { ActionService, ActionType } from './../services/actions.js';
import {
  ConcurrenceService,
  ConcurrenceType,
  convertConcurrencePrismaToOpenAPI,
} from './../services/concurrences.js';
import { CommentService } from './../services/comments.js';
import { WorkflowService } from './../workflow/workflow.js';
import { emailQueueType, EmailService } from './../emails/emailService.js';
import {
  allConcurrencesSubmittedTemplate,
  concurrenceSubmittedTemplate,
  ntiaInitialApproveTemplate,
  ntiaReviewTemplate,
  requestSubmittedTemplate,
  ntiaFinalApproveTemplate,
  initialRevisionTemplate,
  ntiaFinalRevisionTemplate,
  revisionSubmittedTemplate,
  ntiaRevisionReviewTemplate,
  ntiaFinalRevisionAgenciesTemplate,
  federalNotConcurredTemplate,
  ntiaFinalDenialTemplate,
  concurrenceWithConditionsTemplate,
  ntiaApproveWithConditionsTemplate,
  ntiaInitialAutoApproveTemplate,
  ntiaConcurrenceReminderEmailTemplate,
  ntiaApprovalReminderEmailTemplate,
} from './../emails/emailTemplates.js';

interface Message {
  id: number;
  inquiry_id: number;
  sender: string;
  content: string;
  timestamp: string;
  sender_entity_id: number;
  authoredByUser: boolean;
}

interface Inquiry {
  id: number;
  request_id: number;
  entityA_id: number;
  entityB_id: number;
  messages: Message[];
}

interface InquiryWrapper {
  recipientEntityName: string;
  recipientEntityId: number;
  recipientEntityType?: typeof EntityEnum;
  inquiry: Inquiry | null;
}

type InquiriesGroupedByEntityType = Record<string, InquiryWrapper[]>;

/**
 * Retrieves all requests.
 * @async
 * @function getRequests
 * @param {Request} req - The Express request object containing request query parameters (if any).
 * @param {Response} res - The Express response object used to send back a list of requests.
 * @returns {Promise<void>} Resolves with a JSON array of requests or logs the error if failed.
 * @description Fetches all requests from the database and sends them in the response.
 */
export const getRequests = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    const rawStatuses = req.query.statuses;

    const statuses = Array.isArray(rawStatuses)
      ? rawStatuses.filter(
          (status): status is string => typeof status === 'string'
        )
      : typeof rawStatuses === 'string'
        ? [rawStatuses]
        : undefined;

    const unread = req.query.unread ? req.query.unread === 'true' : undefined;
    const search = req.query.search as string | undefined;
    const sortBy = parseRequestSortKey(req.query.sortBy);
    const sortDirection = parseRequestSortDirection(req.query.sortDirection);
    const filterRules = parseRequestFilterRules(req.query.filterRules);
    const timezone =
      typeof req.query.timezone === 'string' ? req.query.timezone : undefined;
    const referenceDate =
      typeof req.query.referenceDate === 'string'
        ? req.query.referenceDate
        : undefined;
    // Use authenticated user's ID instead of trusting query parameter
    const userExternalId = extractAndOverrideUserId(req);

    const result = await new RequestService().getRequestsWithUnreadCounts({
      page,
      pageSize,
      statuses,
      unread,
      search,
      userExternalId,
      sortBy,
      sortDirection,
      filterRules,
      timezone,
      referenceDate,
    });

    const { data, ...params } = result;
    const requests = await Promise.all(
      data.map(async (requestPrisma) => {
        const { frequencies, ...otherFields } =
          await convertRequestPrismaToOpenAPI(requestPrisma);
        return {
          ...otherFields,
          frequencies: frequencies.map(({ frequency }) => frequency),
        };
      })
    );

    res.status(200).json({ ...params, data: requests });
  } catch (error) {
    if (error instanceof RequestListQueryError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    // Structured log to avoid log injection; keep message constant and put values in fields.
    logWithOperation('error', 'Error fetching requests', req, {
      error: sanitizeForLogs(String(error)),
    });
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Validates receivers conditionally - ensures optional receivers are fully valid if they have any values.
 * @function validateReceiversConditionally
 * @param {any} frequencies - Array of frequency objects containing receivers.
 * @returns {Array} Array of validation errors, empty if all valid.
 */
function validateReceiversConditionally(
  frequencies: FrequencyType[]
): Array<{ path: string; message: string }> {
  const errors: Array<{ path: string; message: string }> = [];

  if (!Array.isArray(frequencies)) {
    return errors;
  }

  frequencies.forEach((frequency, freqIndex) => {
    if (!frequency.receivers || !Array.isArray(frequency.receivers)) {
      return;
    }

    // Validate each receiver after the first one (index 0 is always required)
    frequency.receivers.forEach(
      (receiver: ReceiverType, receiverIndex: number) => {
        if (receiverIndex === 0) return; // First receiver is always required

        if (!receiver) return;

        // Check if receiver has any meaningful values (same logic as frontend)
        const hasAnyValue = Object.entries(receiver).some(([key, value]) => {
          if (key === 'antenna_altitude_unit') return false; // Skip default unit value
          if (value === undefined || value === null || value === '')
            return false;
          if (typeof value === 'string' && value.trim() === '') return false;
          return true;
        });

        if (hasAnyValue) {
          // If receiver has any values, all required fields must be present
          const requiredFields = [
            'transmission_start',
            'transmission_end',
            'antenna_type',
            'antenna_gain',
            'antenna_beamwidth',
            'antenna_altitude',
            'location_of_receiving_ground_station',
            'longitude_of_receiving_antenna',
            'latitude_of_receiving_antenna',
          ];

          requiredFields.forEach((field) => {
            const value = receiver[field];
            if (value === undefined || value === null || value === '') {
              errors.push({
                path: `frequencies.${freqIndex}.receivers.${receiverIndex}.${field}`,
                message: 'Required.',
              });
            }
            if (typeof value === 'string' && value.trim() === '') {
              errors.push({
                path: `frequencies.${freqIndex}.receivers.${receiverIndex}.${field}`,
                message: 'Required.',
              });
            }
          });
        }
      }
    );
  });

  return errors;
}

/**
 * Validates a request against a dynamic schema based on available frequency ranges.
 * @async
 * @function validateRequest
 * @param {RequestType} requestData - The request data to validate.
 * @returns {Promise<import('zod').SafeParseReturnType<RequestType, RequestType>>} The validation result.
 */
async function validateRequest(requestData: RequestType) {
  const frequencyRanges =
    await new FrequencyRangeService().getAllowedFrequencyRanges();

  const validationResult =
    portalFormSchemaExtended(frequencyRanges).safeParse(requestData);

  if (!validationResult.success) {
    logValidation('Request validation failed', 'frequencyRanges', false, [
      sanitizeForLogs(validationResult.error.message),
    ]);
    return validationResult;
  }
  // Then, validate receivers conditionally
  const receiverErrors = validateReceiversConditionally(
    requestData.frequencies || []
  );

  if (receiverErrors.length > 0) {
    logValidation(
      'Conditional receiver validation failed',
      'receiverErrors',
      false,
      receiverErrors.map((err) => String(err))
    );
    return {
      success: false,
      error: {
        issues: receiverErrors.map((err) => ({
          code: 'custom',
          path: err.path.split('.'),
          message: err.message,
        })),
        message: 'Invalid receiver data: conditional validation failed',
      },
    };
  }
  return validationResult;
}

/**
 * Stores the uploaded file to Azure Blob Storage.
 * @private
 * @function storeFile
 * @param {Request} req - The Express request object containing the uploaded files.
 * @param {string} fieldname - The field name of the file in the request body.
 * @returns {Promise<string>} Resolves with the unique identifier of the uploaded blob in Azure Storage.
 * @description Uploads the file from the request to Azure Blob Storage and returns the blob's unique identifier.
 */
async function storeFile(req: Request, fieldname: string) {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  if (!azureBlobStorageConnectionString) {
    // Structured log to avoid log injection; keep message constant and put values in fields.
    logWithOperation('error', 'Azure Storage Connection string not found', req);
    throw new Error('Azure Storage Connection string not configured');
  }

  // Create a BlobServiceClient
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    azureBlobStorageConnectionString
  );

  // Container name
  return (async () => {
    try {
      // Create a container if it doesn't exist
      const containerClient = blobServiceClient.getContainerClient(
        azureBlobContainerName
      );

      logWithOperation('info', 'Azure container ready', req, {
        containerName: azureBlobContainerName,
      });

      const content = files[fieldname]?.[0].buffer;
      const uniqueId = uuidv4();
      const blobName = `${uniqueId}-${files[fieldname]?.[0].originalname}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      const uploadBlobResponse = await blockBlobClient.upload(
        content,
        content.length
      );

      logWithOperation(
        'info',
        'File uploaded to blob storage successfully',
        req,
        {
          blobName: sanitizeForLogs(blobName),
          requestId: uploadBlobResponse.requestId,
          contentLength: content.length,
        }
      );
      return `${blobName}`;
    } catch (error) {
      // Structured log to avoid log injection; keep message constant and put values in fields.
      logError(
        'Error uploading file to blob storage',
        error as Error,
        {
          operation: 'store_file',
          component: 'requests_controller',
        },
        req
      );
    }
  })();
}

const getNTIAEmails = async (): Promise<string[]> => {
  const ntiaEntity = (await new EntityService().getEntities()).find(
    (e) => e.type === 'NTIA'
  );
  if (!ntiaEntity) return [];

  const userEmails = await new UsersController().getActiveUsersEmailsByEntityId(
    ntiaEntity.id
  );

  // Combine, filter empties, and remove duplicates
  return [
    ...new Set(
      [...userEmails, ntiaEntity.distribution_list_email].filter(Boolean)
    ),
  ];
};

const getNTIAEntity = async () => {
  const entityService = new EntityService();
  const entities = await entityService.getEntities();
  return entities.find((e) => e.type === 'NTIA');
};

/**
 * Creates a new request after validating the input data and storing files.
 * @async
 * @function createRequest
 * @param {Request} req - The Express request object containing the new request data and files.
 * @param {Response} res - The Express response object to send the result.
 * @returns {Promise<void>} Resolves with the created request or logs the error if failed.
 * @description Handles the creation of a new request, including file upload and data validation.
 */
export const createRequest = async (req: Request, res: Response) => {
  try {
    // Parse and validate incoming request
    req.body.frequencies = JSON.parse(req.body.frequencies);
    const validationResult = await validateRequest(req.body as RequestType);

    if (!validationResult?.success) {
      res.status(400).json(validationResult);
      return;
    }

    // Store uploaded files
    req.body.ecf_cartesian_vectors_format_file_path = await storeFile(
      req,
      'ecf_cartesian_vectors_format_file'
    );
    req.body.ground_track_of_launch_vehicle_2d_img_file_path = await storeFile(
      req,
      'ground_track_of_launch_vehicle_2d_img_file'
    );

    // Set initial fields
    req.body.number_of_frequencies = Number.parseInt(
      req.body.number_of_frequencies
    );
    req.body.status = 'SUBMITTED';
    req.body.read = false;

    // Determine the next workflow status
    const payloadForWorkflow = { current_status: req.body.status, action: '' };
    const nextStatus = await WorkflowService.getNextStatus(payloadForWorkflow);

    if (!nextStatus) {
      res.status(500).json({ error: 'Workflow error, request not created.' });
      return;
    }

    // Convert status enum string to actual StatusEnum value
    const statusKey = Object.entries(StatusEnum).find(
      ([, value]) => value === nextStatus.status
    )?.[0];

    if (statusKey) {
      req.body.status = StatusEnum[statusKey as keyof typeof StatusEnum];
    }

    // Create the request with final status
    const requestService = new RequestService();
    const request = await requestService.create(req.body as RequestTypePrisma);
    logBusinessEvent(
      'Request created successfully',
      'request_creation',
      'request',
      request.id?.toString(),
      {
        requestId: request.id,
        userId: request.user_id,
        operation: 'createRequest',
        component: 'requests_controller',
      }
    );

    // Get authenticated user information for email notifications
    const user = await getAuthenticatedUser(req);

    // Ensure the request is created with the authenticated user's ID
    extractAndOverrideUserId(req);

    // Send notification email to user (includes entity distribution email)
    await EmailService.sendEnhancedNotification(requestSubmittedTemplate, {
      userId: user.id,
      userName: user.name,
      requestId: formatRequestId(
        request.root_request_id || request.id,
        request.createdAt
      ),
      ...(process.env.EMAIL_DEBUG === '1' && {
        optional: `\n\n${JSON.stringify(req.body, null, 2)}\n\n${JSON.stringify(nextStatus, null, 2)}`,
      }),
    });

    // Send review notification to NTIA (includes NTIA distribution email)
    await EmailService.sendEnhancedNotification(ntiaReviewTemplate, {
      entityIds: [(await getNTIAEntity()).id],
      userName: 'NTIA User',
      requestId: formatRequestId(
        request.root_request_id || request.id,
        request.createdAt
      ),
      ...(process.env.EMAIL_DEBUG === '1' && {
        optional: `\n\n${JSON.stringify(req.body, null, 2)}\n\n${JSON.stringify(nextStatus, null, 2)}`,
      }),
    });

    // Respond with created request and next status
    res.status(201).json({ request, status: nextStatus.status });
  } catch (error) {
    let message = error.message;
    let statusCode = 500;
    if (!res.headersSent) {
      if (error instanceof Error) {
        if (error.message.includes('Only COMMERCIAL users')) {
          statusCode = 403;
        } else if (error.message.includes('not found')) {
          statusCode = 404;
        } else {
          statusCode = 500;
          message = 'Failed to create request';
        }
      } else {
        statusCode = 500;
        message = 'Failed to create request';
      }
    }
    // Structured log to avoid log injection; keep message constant and put values in fields.
    logError(
      message,
      error as Error,
      {
        operation: 'createRequest',
        component: 'requests_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: statusCode,
      },
      req
    );
    res.status(statusCode).json({ error: message });
  }
};

/**
 * Downloads a blob from Azure Storage and converts it to a base64-encoded string.
 * @async
 * @function downloadBlobAndConvertToBase64
 * @param {string} blobName - The name of the blob to be downloaded.
 * @returns {Promise<string>} Resolves with the base64-encoded string of the blob or an error message if the blob is not found.
 * @description Fetches a blob from Azure Storage, converts it to base64 format, and returns the result.
 */
export async function downloadBlobAndConvertToBase64(
  blobName: string
): Promise<string> {
  try {
    if (!azureBlobStorageConnectionString) {
      // Structured log to avoid log injection; keep message constant and put values in fields.
      logWithOperation(
        'error',
        'Azure Storage Connection string not found for blob download'
      );
      throw new Error('Azure Storage Connection string not configured');
    }
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      azureBlobStorageConnectionString
    );

    const containerClient = blobServiceClient.getContainerClient(
      azureBlobContainerName
    );
    const blobClient = containerClient.getBlobClient(blobName);
    if (!(await blobClient.exists())) {
      return 'Blob not found or empty';
    }
    const downloadResponse = await blobClient.download();

    if (downloadResponse.errorCode || !downloadResponse.readableStreamBody) {
      return 'Blob not found or empty';
    }

    const chunks: Buffer[] = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk, 'utf-8')); // Explicit encoding
      } else if (chunk instanceof Buffer) {
        chunks.push(chunk);
      } else {
        // Structured log to avoid log injection; keep message constant and put values in fields.
        logWithOperation(
          'error',
          'Unexpected chunk type during blob download',
          null,
          {
            chunkType: sanitizeForLogs(String(chunk)),
          }
        );
      }
    }
    const mimetype =
      blobName.lastIndexOf('.') > 0
        ? blobName.substring(blobName.lastIndexOf('.') + 1, blobName.length)
        : '';
    const buffer = Buffer.concat(chunks);
    const base64Data =
      `data:image/${mimetype};base64,` + buffer.toString('base64');
    return base64Data;
  } catch (error) {
    // Structured log to avoid log injection; keep message constant and put values in fields.
    logError('Error downloading blob', error as Error, {
      operation: 'store_file',
      component: 'requests_controller',
      operationType: OperationType.HTTP_REQUEST,
      httpStatusCode: 500,
      additionalData: {
        blobName: sanitizeForLogs(blobName),
        error: sanitizeForLogs(String(error)),
      },
    });
    return 'Blob not found or empty';
  }
}

/**
 * Retrieves a specific request by its ID.
 * @async
 * @function getRequestById
 * @param {Request} req - The Express request object containing the ID of the request to fetch.
 * @param {Response} res - The Express response object to send the result.
 * @returns {Promise<void>} Resolves with the requested data or an error message if not found.
 * @description Fetches a specific request from the database using the provided ID in the URL parameters.
 */
export const getRequestById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  // Use authenticated user's ID instead of trusting query parameter
  const userExternalId = extractAndOverrideUserId(req);
  try {
    const request = await new RequestService().getLatestRevisionForRequest(
      id,
      userExternalId
    );
    if (request) {
      logWithOperation('info', 'Retrieved request details', req, {
        requestId: request.id,
        rootRequestId: request.root_request_id,
        status: request.status,
      });

      const requestDetails: RequestDetails =
        await convertRequestPrismaToOpenAPI(request);

      const ecf_cartesian_vectors_format_file =
        await downloadBlobAndConvertToBase64(
          request.ecf_cartesian_vectors_format_file_path
        );
      requestDetails.ecf_cartesian_vectors_format_file =
        ecf_cartesian_vectors_format_file !== 'Blob not found or empty'
          ? ecf_cartesian_vectors_format_file
          : '';
      const ground_track_of_launch_vehicle_2d_img_file =
        await downloadBlobAndConvertToBase64(
          request.ground_track_of_launch_vehicle_2d_img_file_path
        );
      requestDetails.ground_track_of_launch_vehicle_2d_img_file =
        ground_track_of_launch_vehicle_2d_img_file !== 'Blob not found or empty'
          ? ground_track_of_launch_vehicle_2d_img_file
          : '';
      res.status(200).json(requestDetails);
    } else {
      res.status(404).json({ message: 'Request not found' });
    }
  } catch (error) {
    let message = error.message;
    let statusCode = 500;
    if (error instanceof Error) {
      if (
        error.message.includes(
          'COMMERCIAL users can only view requests created by their own entity'
        )
      ) {
        res.status(403).json({
          message:
            'Access denied: You can only view requests created by your own entity',
        });
      } else if (error.message.includes('User not found')) {
        message = 'Invalid user credentials';
        statusCode = 401;
      } else if (error.message.includes('Request not found')) {
        message = 'Request not found';
        statusCode = 404;
      } else {
        message = 'Internal server error';
        statusCode = 500;
      }
    } else {
      message = 'Internal server error';
      statusCode = 500;
    }
    // Structured log to avoid log injection; keep message constant and put values in fields.
    logError(
      message,
      error as Error,
      {
        operation: 'getRequestById',
        component: 'requests_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: statusCode,
        additionalData: {
          requestId: id,
        },
      },
      req
    );
    res.status(statusCode).json({ message: message });
  }
};

/**
 * Updates a specific request by its ID.
 * @async
 * @function putRequest
 * @param {Request} req - The Express request object containing the updated request data.
 * @param {Response} res - The Express response object to send the result.
 * @returns {Promise<void>} Resolves with the updated request or an error message if not found.
 * @description Handles updating the data of an existing request based on the provided ID in the URL parameters.
 */
export const putRequest = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const _request = req.body;
  try {
    const user = await new UsersService().getUserByExternalId(_request.user_id);
    if (!user) {
      // Structured log to avoid log injection; keep message constant and put values in fields.
      logWithOperation('warn', 'User not found for request update', req, {
        userExternalId: sanitizeForLogs(_request.user_id),
      });
      throw new Error(`User with external ID ${_request.user_id} not found`);
    }

    // Validate that user can update requests
    await new RequestService().validateUserCanModifyRequests(user.id);

    // Validate request data if it contains frequencies
    if (_request.frequencies) {
      // Parse frequencies if they're a string
      if (typeof _request.frequencies === 'string') {
        _request.frequencies = JSON.parse(_request.frequencies);
      }

      const validationResult = await validateRequest(_request as RequestType);

      if (!validationResult?.success) {
        res.status(400).json({
          error: 'Invalid request data',
          details: validationResult,
        });
        return;
      }
    }

    const request = await new RequestService().putRequest(id, _request);
    res.status(200).json(request);
  } catch (error) {
    let message = error.message;
    let statusCode = 500;
    if (error instanceof Error) {
      if (error.message.includes('Only COMMERCIAL users')) {
        statusCode = 403;
      } else if (error.message.includes('not found')) {
        statusCode = 404;
      } else {
        message = 'Internal server error';
      }
    } else {
      statusCode = 404;
      message = 'Request not found';
    }
    logError(
      message,
      error as Error,
      {
        operation: 'getRequestById',
        component: 'requests_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: statusCode,
        additionalData: {
          requestId: id,
        },
      },
      req
    );
    res.status(statusCode).json({ message: message });
  }
};

/**
 * Retrieves all approvals associated with a specific request.
 * @async
 * @function getApprovalsByRequestId
 * @param {Request} req - Express request object containing the request ID as a parameter.
 * @param {Response} res - Express response object used to send back the approvals.
 * @returns {Promise<void>} Resolves with a list of approvals or an error message.
 */
export const getApprovalsByRequestId = async (req: Request, res: Response) => {
  const requestId = parseInt(req.params.id);
  try {
    const approvals = await new ApprovalService().getByRequestId(
      requestId,
      req.query['user_id'] as string
    );

    // Log successful retrieval with user context
    logBusinessEvent(
      'Approvals retrieved successfully',
      'approval_retrieval',
      null,
      requestId.toString(),
      {
        approvalsCount: approvals.length,
        operation: 'getApprovalsByRequestId',
        component: 'requests_controller',
      },
      req
    );

    res.status(200).json(approvals);
  } catch (error) {
    // Structured error log with user context
    logError(
      'Error fetching approvals',
      error as Error,
      {
        operation: 'getApprovalsByRequestId',
        component: 'requests_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: 500,
        additionalData: {
          requestId: requestId.toString(),
        },
      },
      req
    );
    res.status(500).json({ error: 'Failed to fetch approvals' });
  }
};

/**
 * Handles the approval process for a request, including creating an approval record and updating the request status.
 * @async
 * @function requestApproval
 * @param {number} requestId - The ID of the request to approve.
 * @param {string} userExternalId - The external ID of the user performing the action.
 * @param {string} userName - The name of the user performing the action.
 * @param {string} userType - The type of user (e.g., COMMERCIAL, NTIA).
 * @param {string} action - The action being performed (e.g., approve, deny).
 * @param {ApprovalType} approval - The approval data to create.
 * @param {number} [federalAgencyId] - Optional federal agency ID for the action.
 * @returns {Promise<{ errors?: string[]; createdApproval?: ApprovalType; nextStatus?: any }>} - Result containing errors, created approval, and next status.
 */
export const requestApproval = async (
  requestId: number,
  userExternalId: string,
  userName: string,
  userType: string,
  action: string,
  approval: ApprovalType,
  federalAgencyId?: number
): Promise<{
  errors?: string[];
  createdApproval?: ApprovalType;
  nextStatus?: { status: string };
}> => {
  const requestService = new RequestService();
  const approvalService = new ApprovalService();
  const errors: string[] = [];

  const request = await requestService.getLatestRevisionForRequest(
    requestId,
    userExternalId
  );
  if (!request) {
    // Structured log to avoid log injection; keep message constant and put values in fields.
    logWithOperation('error', 'Request not found', null, {
      requestId: request.id,
    });
    errors.push('Request not found');
    return { errors };
  }

  const payloadForWorkflow = {
    current_status: request.status,
    action,
  };

  const nextStatus = await WorkflowService.getNextStatus(payloadForWorkflow);
  if (!nextStatus) {
    // Structured log to avoid log injection; keep message constant and put values in fields.
    logWithOperation('error', 'Workflow error, approval not added', null, {
      requestId: request.id,
    });
    errors.push('Workflow error, approval not added.');
    return { errors };
  }

  const statusKey = Object.entries(StatusEnum).find(
    ([, value]) => value === nextStatus.status
  )?.[0];

  if (!statusKey) {
    // Structured log to avoid log injection; keep message constant and put values in fields.
    logWithOperation('error', 'Invalid next status from workflow', null, {
      requestId: request.id,
      nextStatus,
    });
    errors.push('Invalid next status');
    return { errors };
  }

  request.status = StatusEnum[statusKey as keyof typeof StatusEnum];

  approval.request_id = requestId;
  const createdApproval = await approvalService.create(approval);
  logBusinessEvent(
    'Approval created successfully',
    'approval_creation',
    'approval',
    createdApproval.id?.toString(),
    {
      requestId: request.id,
      userId: approval.user_id,
      operation: 'requestApproval',
      component: 'requests_controller',
    }
  );

  await requestService.updateRequestStatus(
    createdApproval.request_id,
    request.status
  );

  // Email logic based on new status

  if (request.status === StatusEnum.UNDER_FEDERAL_AGENCIES_REVIEW) {
    // Fetch active federal agencies and their entity IDs
    const federalAgencies = await new FederalAgencyService().getAgencies();
    const activeAgencyEntityIds = federalAgencies
      .filter((agency) => agency.active)
      .map((agency) => agency.id);

    if (action == 'auto_approve') {
      // If auto_approve send email specific notification only to NTIA
      await EmailService.sendEnhancedNotification(
        ntiaInitialAutoApproveTemplate,
        {
          entityIds: [(await getNTIAEntity()).id],
          userName: 'NTIA User',
          requestId: formatRequestId(
            request.root_request_id || request.id,
            request.createdAt
          ),
          ...(process.env.EMAIL_DEBUG === '1' && {
            optional: `\n\n${JSON.stringify(createdApproval, null, 2)}\n\n${JSON.stringify(nextStatus, null, 2)}`,
          }),
        }
      );
    }

    // Send email notification to federal agencies (includes their distribution emails) and NTIA (includes NTIA distribution email)
    await EmailService.sendEnhancedNotification(ntiaInitialApproveTemplate, {
      entityIds: activeAgencyEntityIds,
      userName: 'Federal Agency User',
      requestId: formatRequestId(
        request.root_request_id || request.id,
        request.createdAt
      ),
      additionalEmails: {
        cc: await getNTIAEmails(),
      },
      ...(process.env.EMAIL_DEBUG === '1' && {
        optional: `\n\n${JSON.stringify(createdApproval, null, 2)}\n\n${JSON.stringify(nextStatus, null, 2)}`,
      }),
    });
  }
  if (request.status === StatusEnum.APPROVED) {
    // Get the original request user by internal ID
    const usersService = new UsersService();
    const requestUser = await usersService.getUserById(request.user_id);

    if (requestUser) {
      await EmailService.sendEnhancedNotification(ntiaFinalApproveTemplate, {
        userId: requestUser.id,
        userName: requestUser.name,
        requestId: formatRequestId(
          request.root_request_id || request.id,
          request.createdAt
        ),
        additionalEmails: {
          cc: await getNTIAEmails(),
        },
        ...(process.env.EMAIL_DEBUG === '1' && {
          optional: `\n\n${JSON.stringify(createdApproval, null, 2)}\n\n${JSON.stringify(nextStatus, null, 2)}`,
        }),
      });
    }
  }
  if (request.status === StatusEnum.APPROVED_WITH_CONDITIONS) {
    // Get the original request user by internal ID
    const usersService = new UsersService();
    const requestUser = await usersService.getUserById(request.user_id);

    if (requestUser) {
      await EmailService.sendEnhancedNotification(
        ntiaApproveWithConditionsTemplate,
        {
          userId: requestUser.id,
          userName: requestUser.name,
          requestId: formatRequestId(
            request.root_request_id || request.id,
            request.createdAt
          ),
          bodyParams: [approval.condition],
          additionalEmails: {
            cc: await getNTIAEmails(),
          },
          ...(process.env.EMAIL_DEBUG === '1' && {
            optional: `\n\n${JSON.stringify(createdApproval, null, 2)}\n\n${JSON.stringify(nextStatus, null, 2)}`,
          }),
        }
      );
    }
  }

  // Log action
  try {
    const actionService = new ActionService();
    const rootRequestId = request.root_request_id || requestId;
    await actionService.create({
      request_id: rootRequestId,
      user_id: approval.user_id,
      user_name: userName,
      user_type: userType,
      federal_agency_id: federalAgencyId,
      action,
      details: approval.condition || '',
      createdAt: new Date().toISOString(),
    } as ActionType);

    logBusinessEvent(
      'Action created successfully',
      'action_creation',
      'action',
      requestId.toString(),
      {
        requestId: requestId,
        userId: approval.user_id,
        operation: 'requestApproval',
        component: 'requests_controller',
      }
    );
  } catch (error) {
    // Structured log to avoid log injection; keep message constant and put values in fields.
    logError('Failed to create action record for approval', error as Error, {
      operation: 'requestApproval',
      component: 'requests_controller',
      additionalData: {
        requestId: requestId.toString(),
      },
    });
  }

  return { createdApproval, nextStatus };
};

/**
 * Creates an approval for a given request and updates the request's status.
 *
 * This function performs the following steps:
 * 1. Retrieves the request by ID.
 * 2. Determines the next status based on the workflow.
 * 3. Creates an approval record linked to the request.
 * 4. Updates the request's status.
 * 5. Sends an email notification about the approval creation.
 *
 * @param {Request} req - The Express request object.
 *  - `params.id` should contain the request ID.
 *  - `body` should contain the approval details.
 * @param {Response} res - The Express response object.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 *
 * @throws {500} If the request is not found, workflow fails, or an internal error occurs.
 * @throws {404} If the request ID does not exist.
 */
export const createApprovalForRequest = async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    // Use authenticated user's ID instead of trusting request body/query
    const userExternalId = extractAndOverrideUserId(req);
    const userName = req.body.user_name;
    const userType = req.body.user_type;
    const federalAgencyId = req.body.federal_agency_id;
    const action =
      req?.body?.condition?.length > 0 ? 'approve_with_conditions' : 'approve';
    const approval = req.body as ApprovalType;

    const { errors, createdApproval, nextStatus } = await requestApproval(
      requestId,
      userExternalId,
      userName,
      userType,
      action,
      approval,
      federalAgencyId
    );

    if (errors) {
      logError(
        `Errors occurred while processing request ID ${requestId}:`,
        new Error(sanitizeForLogs(String(errors))),
        {
          operation: 'createApprovalForRequest',
          component: 'requests_controller',
          operationType: OperationType.BUSINESS_LOGIC,
        },
        req
      );
      return res.status(400).json({ success: false, errors });
    }

    // Log successful approval creation with user context
    logBusinessEvent(
      'Approval created successfully',
      'approval_creation',
      'request',
      requestId.toString(),
      {
        approvalId: createdApproval?.id?.toString(),
        action: action,
        hasConditions: !!req.body.condition?.trim(),
        newStatus: nextStatus?.status,
        operation: 'createApprovalForRequest',
        component: 'requests_controller',
      },
      req
    );

    return res.status(201).json({
      success: true,
      data: createdApproval,
      status: nextStatus?.status,
    });
  } catch (error) {
    // Structured error log with user context
    logError(
      'Error creating approval',
      error as Error,
      {
        operation: 'createApprovalForRequest',
        component: 'requests_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: 500,
        additionalData: {
          requestId: req.params.id,
        },
      },
      req
    );
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create approval' });
    }
  }
};

/**
 * Retrieves all denials associated with a specific request.
 * @async
 * @function getDenialsByRequestId
 * @param {Request} req - Express request object containing the request ID as a parameter.
 * @param {Response} res - Express response object used to send back the denials.
 * @returns {Promise<void>} Resolves with a list of denials or an error message.
 */
export const getDenialsByRequestId = async (req: Request, res: Response) => {
  const requestId = parseInt(req.params.id);
  try {
    const denials = await new DenialService().getByRequestId(
      requestId,
      req.query['user_id'] as string
    );
    res.status(200).json(denials);
  } catch (error) {
    logError(
      'Failed to fetch denials',
      error as Error,
      {
        operation: 'getDenialsByRequestId',
        component: 'requests_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: 500,
        additionalData: {
          requestId: req.params.id,
        },
      },
      req
    );
    res.status(500).json({ error: 'Failed to fetch denials' });
  }
};

/**
 * Creates a denial for a given request.
 * @async
 * @function createDenialForRequest
 * @param {Request} req - Express request object containing the request ID and denial details.
 * @param {Response} res - Express response object used to send back the created denial.
 * @returns {Promise<void>} Resolves with the created denial or an error message.
 */
export const createDenialForRequest = async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    // Use authenticated user's ID instead of trusting request body/query
    const userExternalId = extractAndOverrideUserId(req);
    const requestService = new RequestService();
    const denialService = new DenialService();

    const request = await requestService.getLatestRevisionForRequest(
      requestId,
      userExternalId
    );
    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    const action =
      req?.body?.is_final === 'true' || req?.body?.is_final === true
        ? 'finalize_denial'
        : 'request_revisions';

    /**
     * A denial can be an outright denial or a request for revisions. The below applies to requesting revisions.
     * If no requested changes are found for the request, then a denial cannot be created
     */
    // Use root request ID to lookup requested revisions
    const rootRequestId = request.root_request_id || requestId;
    // When the action is request_revisions, req.body.reason is wrapped in an array
    // and represents the changes being requested
    const requestedChanges = req.body.reason ? [req.body.reason] : [];

    if (
      action === 'request_revisions' &&
      (!requestedChanges || requestedChanges.length === 0)
    ) {
      res.status(404).json({ error: 'Requested revisions not found' });
      return;
    }

    const payloadForWorkflow = {
      current_status: request.status,
      action,
    };

    const nextStatus = await WorkflowService.getNextStatus(payloadForWorkflow);
    if (!nextStatus) {
      logError(
        'Workflow error, denial not added',
        'WorkflowService returned null',
        {
          operation: 'createDenialForRequest',
          component: 'requests_controller',
          operationType: OperationType.HTTP_REQUEST,
          httpStatusCode: 500,
          additionalData: { requestId: req.params.id },
        },
        req
      );
      res.status(500).json({ error: 'Workflow error, denial not added.' });
      return;
    }
    // Update request's status
    const statusKey = Object.entries(StatusEnum).find(
      ([, value]) => value === nextStatus.status
    )?.[0];

    if (!statusKey) {
      logError(
        'Invalid next status',
        'WorkflowService returned invalid status',
        {
          operation: 'createDenialForRequest',
          component: 'requests_controller',
          operationType: OperationType.HTTP_REQUEST,
          httpStatusCode: 500,
          additionalData: { requestId: req.params.id },
        },
        req
      );
      res.status(500).json({ error: 'Invalid next status' });
      return;
    }

    request.status = StatusEnum[statusKey as keyof typeof StatusEnum];

    // Create the denial
    const denial = req.body as DenialType;
    denial.request_id = requestId;

    const createdDenial = await denialService.create(denial);
    logBusinessEvent(
      'Denial created successfully',
      'denial_creation',
      'denial',
      requestId.toString(),
      {
        requestId: requestId,
        userId: denial.user_id,
        operation: 'createDenialForRequest',
        component: 'requests_controller',
      }
    );

    // Update the request with the new status
    await requestService.updateRequestStatus(
      createdDenial.request_id,
      request.status
    );
    const requestIdString = formatRequestId(
      request.root_request_id || request.id,
      request.createdAt
    );

    // Automatically create action record for denial (BEFORE sending emails and responses!)
    try {
      const actionService = new ActionService();

      // For request_revisions actions, include the requested changes in details
      let actionDetails = '';

      if (action === 'request_revisions' && requestedChanges?.length) {
        // Just the requested changes, joined by semicolon
        actionDetails = requestedChanges.join('; ');
        // If the action is finalize_denial, req.body.reason represents the reason for denial
      } else if (action === 'finalize_denial' && denial.reason) {
        actionDetails = `Reason: ${denial.reason}`;
      }

      const createdAction = await actionService.create({
        request_id: rootRequestId,
        user_id: denial.user_id,
        user_name: req.body.user_name,
        user_type: req.body.user_type,
        federal_agency_id: req.body.federal_agency_id,
        action: action, // 'finalize_denial' or 'request_revisions'
        details: actionDetails,
        createdAt: new Date().toISOString(),
      } as ActionType);
      logBusinessEvent(
        'Action created successfully',
        'action_creation',
        'action',
        createdAction.id?.toString(),
        {
          requestId: requestId,
          userId: denial.user_id,
          operation: 'createDenialForRequest',
          component: 'requests_controller',
        }
      );
    } catch (error) {
      logError(
        'Failed to create action record for denial',
        error as Error,
        {
          operation: 'createDenialForRequest',
          component: 'requests_controller',
          operationType: OperationType.HTTP_REQUEST,
          httpStatusCode: 500,
          additionalData: {
            rootRequestId,
            requestId,
            denialUserId: denial.user_id,
          },
        },
        req
      );
      // Don't fail the entire request if action creation fails
    }

    // Now send status-specific emails
    if (request.status === StatusEnum.DENIED) {
      // Get the original request user by internal ID
      const usersService = new UsersService();
      const requestUser = await usersService.getUserById(request.user_id);

      if (requestUser) {
        await EmailService.sendEnhancedNotification(ntiaFinalDenialTemplate, {
          userId: requestUser.id,
          userName: requestUser.name,
          requestId: requestIdString,
          additionalEmails: {
            cc: await getNTIAEmails(),
          },
          ...(process.env.EMAIL_DEBUG === '1' && {
            optional: `\n\n${JSON.stringify(request, null, 2)}\n\n${JSON.stringify(nextStatus, null, 2)}`,
          }),
        });
      }
    }

    if (action === 'request_revisions' && requestedChanges?.length) {
      if (request.status === StatusEnum.UNDER_INITIAL_REVISION_PER_NTIA) {
        // Get the original request user by internal ID
        const usersService = new UsersService();
        const requestUser = await usersService.getUserById(request.user_id);

        if (requestUser) {
          await EmailService.sendEnhancedNotification(initialRevisionTemplate, {
            userId: requestUser.id,
            userName: requestUser.name,
            requestId: requestIdString,
            bodyParams: [requestedChanges[0]],
            additionalEmails: {
              cc: await getNTIAEmails(),
            },
            ...(process.env.EMAIL_DEBUG === '1' && {
              optional: `\n\n${JSON.stringify(request, null, 2)}\n\n${JSON.stringify(nextStatus, null, 2)}`,
            }),
          });
        }
      }
      if (request.status === StatusEnum.UNDER_FINAL_REVISION_PER_NTIA) {
        // Get the original request user by internal ID
        const usersService = new UsersService();
        const requestUser = await usersService.getUserById(request.user_id);

        if (requestUser) {
          await EmailService.sendEnhancedNotification(
            ntiaFinalRevisionTemplate,
            {
              entityIds: [requestUser.entity.id],
              userName: requestUser.name,
              requestId: requestIdString,
              bodyParams: [requestedChanges[0]],
              additionalEmails: {
                cc: await getNTIAEmails(),
              },
              ...(process.env.EMAIL_DEBUG === '1' && {
                optional: `\n\n${JSON.stringify(request, null, 2)}\n\n${JSON.stringify(nextStatus, null, 2)}`,
              }),
            }
          );
        }
      }
    }

    res.status(201).json({ ...createdDenial, status: nextStatus });
  } catch (error) {
    logError(
      'Failed to create denial',
      error as Error,
      {
        operation: 'createDenialForRequest',
        component: 'requests_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: 500,
        additionalData: { requestId: req.params.id },
      },
      req
    );
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create denial' });
    }
  }
};

/**
 * Retrieves all concurrences associated with a specific request.
 * @async
 * @function getConcurrencesByRequestId
 * @param {Request} req - Express request object containing the request ID as a parameter.
 * @param {Response} res - Express response object used to send back the concurrences.
 * @returns {Promise<void>} Resolves with a list of concurrences or an error message.
 */
export const getConcurrencesByRequestId = async (
  req: Request,
  res: Response
) => {
  const requestId = parseInt(req.params.id);
  try {
    const concurrences = await new ConcurrenceService().getByRequestId(
      requestId,
      req.query['user_id'] as string
    );
    // Transform the Prisma data to OpenAPI format
    const transformedConcurrences = concurrences.map(
      convertConcurrencePrismaToOpenAPI
    );
    res.status(200).json(transformedConcurrences);
  } catch (error) {
    logError(
      'Failed to fetch concurrences',
      error as Error,
      {
        operation: 'getConcurrencesByRequestId',
        component: 'requests_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: 500,
        additionalData: { requestId: req.params.id },
      },
      req
    );

    res.status(500).json({ error: 'Failed to fetch concurrences' });
  }
};

/**
 * Creates a concurrence for a given request and updates the request's status if all active agencies have concurred.
 *
 * This function performs the following steps:
 * 1. Creates a concurrence and fetches the associated request simultaneously.
 * 2. Sends an email notification about the concurrence creation.
 * 3. Checks if all active federal agencies have submitted their concurrences.
 * 4. If all have concurred, determines the next action based on concurrence outcomes.
 * 5. Updates the request's status based on the workflow.
 * 6. Sends an email notification about the status update.
 *
 * @param {Request} req - The Express request object.
 *  - `params.id` should contain the request ID.
 *  - `body` should contain the concurrence details.
 * @param {Response} res - The Express response object.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 *
 * @throws {404} If the request ID does not exist.
 * @throws {500} If the workflow fails, status update fails, or an internal error occurs.
 */
export const createConcurrenceForRequest = async (
  req: Request,
  res: Response
) => {
  const startTime = Date.now();
  const requestId = parseInt(req.params.id);
  const userExternalId = extractAndOverrideUserId(req);

  // Log operation start
  logWorkflowEvent(
    'Concurrence submission started',
    'concurrence_submission',
    'started',
    requestId.toString(),
    'request',
    { requestId: requestId.toString() },
    req
  );

  try {
    const concurrence = req.body as ConcurrenceType;
    concurrence.request_id = requestId;

    const concurrenceService = new ConcurrenceService();
    const requestService = new RequestService();
    const usersService = new UsersService();

    // Get user and entity information first to check voting permissions
    // Use authenticated user's ID instead of trusting request body
    concurrence.user_id = userExternalId;

    const dbStartTime = Date.now();
    const [user, request] = await Promise.all([
      usersService.getUserByExternalId(userExternalId),
      requestService.getLatestRevisionForRequest(requestId, userExternalId),
    ]);

    // Log database operations
    logDatabaseOperation(
      'Retrieved user and request data for concurrence validation',
      'SELECT_USER_AND_REQUEST',
      'users,requests',
      Date.now() - dbStartTime,
      2,
      req
    );

    if (!request) {
      logError(
        'Request not found for concurrence submission',
        'Request not found',
        {
          operation: 'createConcurrenceForRequest',
          component: 'requests_controller',
          operationType: OperationType.BUSINESS_LOGIC,
          httpStatusCode: 404,
          entityId: requestId.toString(),
          entityType: 'request',
        },
        req
      );
      res.status(404).json({ error: 'Request not found.' });
      return;
    }

    if (!user?.entity) {
      logError(
        'Failed to retrieve user and entity information for concurrence',
        'User entity not found',
        {
          operation: 'createConcurrenceForRequest',
          component: 'requests_controller',
          operationType: OperationType.BUSINESS_LOGIC,
          httpStatusCode: 500,
          entityId: requestId.toString(),
          entityType: 'request',
        },
        req
      );
      res
        .status(500)
        .json({ error: 'Failed to retrieve user and entity information.' });
      return;
    }

    const userEntity = user.entity;

    // Check if the user can concur (only applicable to FEDERAL_AGENCY users)
    if (userEntity.type === 'FEDERAL_AGENCY' && !user.can_concur) {
      logAuthEvent(
        'User authorization failed for concurrence submission',
        'concurrence_authorization_failed',
        false,
        userExternalId,
        'User not authorized to submit concurrences',
        null,
        req,
        'concurrence'
      );
      res.status(403).json({
        error: 'This user is not authorized to submit concurrences.',
      });
      return;
    }

    // Log business metric for concurrence type
    logBusinessEvent(
      'Concurrence submitted by user',
      'concurrence_submitted',
      'request',
      requestId.toString(),
      {
        concurrenceType: concurrence.concurred ? 'concur' : 'not_concur',
        hasConditions: !!concurrence.conditions?.trim(),
        userEntityType: userEntity.type,
        userEntityId: userEntity.id,
      },
      req
    );

    // Create concurrence after validation
    const _createStartTime = Date.now();
    const createdConcurrence = await concurrenceService.create(concurrence);
    logBusinessEvent(
      'Concurrence record created successfully',
      'concurrence_creation',
      'concurrence',
      createdConcurrence.id?.toString(),
      {
        requestId: requestId,
        userId: createdConcurrence.user_id,
        operation: 'createConcurrenceForRequest',
        component: 'requests_controller',
      }
    );

    // Automatically create action record for this individual concurrence
    try {
      const actionService = new ActionService();
      const actionValue = concurrence.concurred
        ? concurrence.conditions?.trim()
          ? 'concur_with_conditions'
          : 'concur'
        : 'not_concur';

      const rootRequestId = request.root_request_id || requestId;
      const createdAction = await actionService.create({
        request_id: rootRequestId,
        user_id: concurrence.user_id,
        user_name: req.body.user_name || user.name || '',
        user_type: req.body.user_type || 'FEDERAL_AGENCY',
        federal_agency_id: req.body.federal_agency_id || userEntity.id,
        action: actionValue,
        details: concurrence.conditions || '',
        createdAt: new Date().toISOString(),
      } as ActionType);
      logBusinessEvent(
        'Action created successfully',
        'action_creation',
        'action',
        createdAction.id?.toString(),
        {
          requestId: requestId,
          userId: concurrence.user_id,
          operation: 'createConcurrenceForRequest',
          component: 'requests_controller',
        }
      );
    } catch (error) {
      logWithOperation(
        'warn',
        'Failed to create action record for individual concurrence',
        req,
        {
          requestId: request.id,
          error: sanitizeForLogs(String(error)),
        }
      );
      // Don't fail the entire request if action creation fails
    }

    // Send notification about concurrence creation
    const requestIdString = formatRequestId(
      request.root_request_id || request.id,
      request.createdAt
    );

    let agencyEmails: string[] = [];
    agencyEmails.push(
      ...(await new UsersController().getActiveUsersEmailsByEntityId(
        userEntity?.id
      ))
    );
    agencyEmails.push(userEntity.distribution_list_email ?? '');

    if (concurrence.concurred === false) {
      await EmailService.sendEnhancedNotification(federalNotConcurredTemplate, {
        entityIds: [(await getNTIAEntity()).id],
        userName: 'NTIA User',
        requestId: requestIdString,
        bodyParams: [`${userEntity.abbreviation}`],
        additionalEmails: {
          cc: agencyEmails,
        },
        ...(process.env.EMAIL_DEBUG === '1' && {
          optional: `\n\nEntity: ${userEntity.id}\nUser: ${concurrence.user_id}\nRequest: ${concurrence.request_id}\n${JSON.stringify(concurrence, null, 2)}\n`,
        }),
      });
    }

    if (concurrence.concurred && !concurrence.conditions?.trim()) {
      await EmailService.sendEnhancedNotification(
        concurrenceSubmittedTemplate,
        {
          entityIds: [(await getNTIAEntity()).id],
          userName: 'NTIA User',
          requestId: requestIdString,
          bodyParams: [`${userEntity.abbreviation}`],
          additionalEmails: {
            cc: agencyEmails,
          },
          ...(process.env.EMAIL_DEBUG === '1' && {
            optional: `\n\nEntity: ${userEntity.id}\nUser: ${concurrence.user_id}\nRequest: ${concurrence.request_id}\n${JSON.stringify(concurrence, null, 2)}\n`,
          }),
        }
      );
    }
    if (concurrence.concurred && concurrence.conditions?.trim()) {
      await EmailService.sendEnhancedNotification(
        concurrenceWithConditionsTemplate,
        {
          entityIds: [(await getNTIAEntity()).id],
          userName: 'NTIA User',
          requestId: requestIdString,
          bodyParams: [`${userEntity.abbreviation}`, concurrence.conditions],
          additionalEmails: {
            cc: agencyEmails,
          },
          ...(process.env.EMAIL_DEBUG === '1' && {
            optional: `\n\nEntity: ${userEntity.id}\nUser: ${concurrence.user_id}\nRequest: ${concurrence.request_id}\n${JSON.stringify(concurrence, null, 2)}\n`,
          }),
        }
      );
    }

    const concurrencesForRequest =
      await concurrenceService.getByRequestId(requestId);

    // Get entity IDs that have submitted concurrences
    const concurredEntityIds = concurrencesForRequest
      .map((c) => c.user?.entity?.id)
      .filter((id): id is number => id !== undefined);

    // Get all active federal agency entities
    const activeFederalAgencyEntities =
      await new EntityService().getActiveFederalAgencyEntities();
    const votingFederalAgencyEntityIds = activeFederalAgencyEntities.map(
      (entity) => entity.id
    );

    // Check if all active federal agency entities have submitted concurrences
    const allActiveFederalAgenciesConcurred =
      votingFederalAgencyEntityIds.every((id) =>
        concurredEntityIds.includes(id)
      );

    if (!allActiveFederalAgenciesConcurred) {
      res.status(201).json(createdConcurrence);
      return;
    }

    // Determine next action based on concurrences
    let action: 'not_concur' | 'concur_with_conditions' | 'concur';

    if (concurrencesForRequest.some((c) => !c.concurred)) {
      action = 'not_concur';
    } else if (
      concurrencesForRequest.some((c) => c.concurred && c.conditions?.trim())
    ) {
      action = 'concur_with_conditions';
    } else {
      action = 'concur';
    }

    const payloadForWorkflow = {
      current_status: request.status,
      action,
    };

    // Determine the next status in the workflow
    const nextStatus = await WorkflowService.getNextStatus(payloadForWorkflow);

    if (!nextStatus) {
      logError(
        'Workflow error, Concurrence created but workflow failed.',
        'Workflow next status undefined',
        {
          operation: 'createConcurrenceForRequest',
          component: 'requests_controller',
          operationType: OperationType.BUSINESS_LOGIC,
          httpStatusCode: 500,
          entityId: requestId.toString(),
          entityType: 'request',
        },
        req
      );
      res.status(500).json({
        error: 'Workflow error, Concurrence created but workflow failed.',
      });
      return;
    }

    const statusKey = Object.entries(StatusEnum).find(
      ([, value]) => value === nextStatus.status
    )?.[0];
    if (statusKey) {
      request.status = StatusEnum[statusKey as keyof typeof StatusEnum];
    }

    // Update request with new status
    await requestService.updateRequestStatus(requestId, request.status);

    // Send notification about status update to NTIA
    await EmailService.sendEnhancedNotification(
      allConcurrencesSubmittedTemplate,
      {
        entityIds: [(await getNTIAEntity()).id],
        userName: 'NTIA User',
        requestId: formatRequestId(
          request.root_request_id || request.id,
          request.createdAt
        ),
        ...(process.env.EMAIL_DEBUG === '1' && {
          optional: `\n\n${JSON.stringify(nextStatus, null, 2)}`,
        }),
      }
    );

    // Log successful completion
    logWorkflowEvent(
      'Concurrence submission completed successfully',
      'concurrence_submission',
      'completed',
      requestId.toString(),
      'request',
      {
        concurrenceId: createdConcurrence.id,
        concurrenceType: concurrence.concurred ? 'concur' : 'not_concur',
        statusChanged: nextStatus.status !== request.status,
        newStatus: nextStatus.status,
      },
      req
    );

    // Log performance metric
    logPerformance(
      'Concurrence creation operation completed',
      'createConcurrenceForRequest',
      Date.now() - startTime,
      OperationType.BUSINESS_LOGIC,
      'concurrence',
      {
        requestId: requestId.toString(),
        concurrenceType: concurrence.concurred ? 'concur' : 'not_concur',
        hasConditions: !!concurrence.conditions?.trim(),
        statusChanged: nextStatus.status !== request.status,
        success: true,
      },
      req
    );

    res.status(201).json({ ...concurrence, status: nextStatus.status });
  } catch (error) {
    // Enhanced error logging
    let message = 'Failed to create concurrence for request';
    let statusCode = 500;

    // Log performance metric for failed operation
    logPerformance(
      'Concurrence creation operation failed',
      'createConcurrenceForRequest_failed',
      Date.now() - startTime,
      OperationType.BUSINESS_LOGIC,
      'concurrence',
      {
        requestId: requestId.toString(),
        errorType:
          error instanceof Error ? error.constructor.name : 'UnknownError',
        success: false,
      },
      req
    );

    if (!res.headersSent) {
      // Check if it's a duplicate entity error
      if (
        error instanceof Error &&
        error.message.includes('has already submitted a concurrence')
      ) {
        message = error.message;
        statusCode = 409;
      } else {
        message = 'Failed to create concurrence.';
        statusCode = 500;
      }
      res.status(statusCode).json({ error: message });
    }

    logError(
      message,
      error as Error,
      {
        operation: 'createConcurrenceForRequest',
        component: 'requests_controller',
        operationType: OperationType.BUSINESS_LOGIC,
        httpStatusCode: statusCode,
        entityId: requestId.toString(),
        entityType: 'request',
        additionalData: {
          userExternalId,
          requestId: requestId.toString(),
        },
      },
      req
    );
  }
};

/**
 * Retrieves all comments associated with a specific request.
 * @async
 * @function getCommentsByRequestId
 * @param {Request} req - Express request object containing the request ID as a parameter.
 * @param {Response} res - Express response object used to send back the comments.
 * @returns {Promise<void>} Resolves with a list of comments or an error message.
 */
export const getCommentsByRequestId = async (req: Request, res: Response) => {
  const requestId = parseInt(req.params.id);
  try {
    const comments = await new CommentService().getByRequestId(
      requestId,
      req.query['user_id'] as string
    );
    res.status(200).json(comments);
  } catch (error) {
    logError(
      'Failed to fetch comments',
      error as Error,
      {
        operation: 'getCommentsByRequestId',
        component: 'requests_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: 500,
        additionalData: {
          requestId: req.params.id,
        },
      },
      req
    );
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

/**
 * Creates a comment for a given request.
 * @async
 * @function createCommentForRequest
 * @param {Request} req - Express request object containing the request ID and comment details.
 * @param {Response} res - Express response object used to send back the created comment.
 * @returns {Promise<void>} Resolves with the created comment or an error message.
 */
export const createCommentForRequest = async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    const comment = await new CommentService().create({
      ...req.body,
      request_id: requestId,
    });
    logBusinessEvent(
      'Comment created successfully',
      'comment_creation',
      'comment',
      comment.id?.toString(),
      {
        requestId: requestId,
        operation: 'createCommentForRequest',
        component: 'requests_controller',
      }
    );

    res.status(201).json(comment);
  } catch (error) {
    logError(
      'Failed to create comment',
      error as Error,
      {
        operation: 'createCommentForRequest',
        component: 'requests_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: 500,
        additionalData: {
          requestId: req.params.id,
        },
      },
      req
    );
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

/**
 * Retrieves all actions for a specific request.
 * @async
 * @function getActionsByRequestId
 * @param {Request} req - Express request object with request ID param.
 * @param {Response} res - Express response object to return the result.
 * @returns {Promise<void>}
 */
export const getActionsByRequestId = async (req: Request, res: Response) => {
  const requestId = parseInt(req.params.id);
  try {
    // Resolve to root request ID to ensure we get actions for the root request
    const request = await new RequestService().getLatestRevisionForRequest(
      requestId
    );
    const rootRequestId = request?.root_request_id || requestId;

    const actions = await new ActionService().getByRequestId(
      rootRequestId,
      req.query['user_id'] as string
    );

    // Convert the actions to OpenAPI format to include user information
    const convertedActions = actions.map((action) => ({
      id: action.id,
      request_id: action.request_id,
      federal_agency_id:
        action.user?.entity?.type === 'FEDERAL_AGENCY'
          ? action.user.entity.id
          : null,
      user_id: action.user?.external_id ?? '',
      user_name: action.user?.name ?? '',
      user_type: action.user?.entity?.type ?? 'COMMERCIAL',
      action: action.action,
      details: action.details,
      createdAt: action.createdAt.toISOString(),
      federal_agency_name: action.federal_agency_name,
      federal_agency_abbr: action.federal_agency_abbr,
    }));

    res.status(200).json(convertedActions);
  } catch (error) {
    logError(
      'Failed to fetch actions',
      error as Error,
      {
        operation: 'getActionsByRequestId',
        component: 'requests_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: 500,
        additionalData: {
          requestId: req.params.id,
        },
      },
      req
    );
    res.status(500).json({ error: 'Failed to fetch actions' });
  }
};

/**
 * Handles the creation of a new revision for an existing request.
 *
 * This controller endpoint performs the following steps:
 * 1. Parses and validates the incoming request body.
 * 2. Stores uploaded files and updates the request body with their file paths.
 * 3. Sets initial fields such as status and read flag.
 * 4. Determines the next workflow status using the WorkflowService.
 * 5. Updates the current revision to mark it as not current.
 * 6. Creates a new revision for the request with incremented revision number.
 * 7. Sends notification emails to the commercial entity user and NTIA POC.
 * 8. Responds with the created request and the next workflow status.
 *
 * @param req - Express request object containing the request data and files.
 * @param res - Express response object used to send the response.
 * @returns A JSON response with the created request and next status, or an error message.
 */
export const createRevision = async (req: Request, res: Response) => {
  try {
    // Parse and validate incoming request
    req.body.frequencies = JSON.parse(req.body.frequencies);
    const validationResult = await validateRequest(req.body as RequestType);

    if (!validationResult?.success) {
      res.status(400).json(validationResult);
      return;
    }

    // Store uploaded files
    req.body.ecf_cartesian_vectors_format_file_path = await storeFile(
      req,
      'ecf_cartesian_vectors_format_file'
    );
    req.body.ground_track_of_launch_vehicle_2d_img_file_path = await storeFile(
      req,
      'ground_track_of_launch_vehicle_2d_img_file'
    );

    // Set initial fields
    req.body.number_of_frequencies = Number.parseInt(
      req.body.number_of_frequencies
    );
    req.body.read = false;

    // Create the request with final status
    const requestService = new RequestService();

    const requestId = parseInt(req.params.id);
    // Use authenticated user's ID instead of trusting request body
    const userExternalId = extractAndOverrideUserId(req);
    const currentRevision = await requestService.getLatestRevisionForRequest(
      requestId,
      userExternalId
    );

    if (!currentRevision) {
      res.status(404).json({ error: 'Request not found.' });
      return;
    }

    // Determine the next workflow status
    const action = (req.query.action as string) || 'resubmit';
    const payloadForWorkflow = {
      current_status: currentRevision.status,
      action: action,
    };

    const nextStatus = await WorkflowService.getNextStatus(payloadForWorkflow);

    if (!nextStatus) {
      res.status(500).json({ error: 'Workflow error, revision not created.' });
      return;
    }

    // Convert status enum string to actual StatusEnum value
    const statusKey = Object.entries(StatusEnum).find(
      ([, value]) => value === nextStatus.status
    )?.[0];

    if (statusKey) {
      req.body.status = StatusEnum[statusKey as keyof typeof StatusEnum];
    }

    // Update current revision flag to false
    await requestService.updateRequestRevisionFlag(currentRevision.id, false);
    req.body.root_request_id = currentRevision.root_request_id || requestId;
    req.body.revision = currentRevision.revision + 1;
    req.body.current_revision = true;
    // Create new revision
    const request = await requestService.create(req.body as RequestTypePrisma);
    logBusinessEvent(
      'Request created successfully',
      'request_creation',
      'request',
      request.id?.toString(),
      {
        requestId: requestId,
        userId: userExternalId,
        status: request.status,
        operation: 'createRevision',
        component: 'requests_controller',
      }
    );

    // Send notification email to user (includes entity distribution email)
    const user = await getAuthenticatedUser(req);
    if (user) {
      await EmailService.sendEnhancedNotification(revisionSubmittedTemplate, {
        userId: user.id,
        userName: user.name,
        requestId: formatRequestId(
          request.root_request_id || request.id,
          request.createdAt
        ),
        additionalEmails: {
          cc: await getNTIAEmails(),
        },
        ...(process.env.EMAIL_DEBUG === '1' && {
          optional: `\n\n${JSON.stringify(request, null, 2)}\n\n${JSON.stringify(nextStatus, null, 2)}`,
        }),
      });
    }

    if (currentRevision.status === StatusEnum.UNDER_FINAL_REVISION_PER_NTIA) {
      // Fetch active federal agencies and their entity IDs
      const federalAgencies = await new FederalAgencyService().getAgencies();
      const activeAgencyEntityIds = federalAgencies
        .filter((agency) => agency.active)
        .map((agency) => agency.id);

      // Send email notification to federal agencies (includes their distribution emails)
      await EmailService.sendEnhancedNotification(
        ntiaFinalRevisionAgenciesTemplate,
        {
          entityIds: activeAgencyEntityIds,
          userName: 'Federal Agency User',
          requestId: formatRequestId(
            request.root_request_id || request.id,
            request.createdAt
          ),
          ...(process.env.EMAIL_DEBUG === '1' && {
            optional: `\n\n${JSON.stringify(request, null, 2)}\n\n${JSON.stringify(nextStatus, null, 2)}`,
          }),
        }
      );
    }
    if (currentRevision.status === StatusEnum.UNDER_INITIAL_REVISION_PER_NTIA) {
      await EmailService.sendEnhancedNotification(ntiaRevisionReviewTemplate, {
        entityIds: [(await getNTIAEntity()).id],
        userName: 'NTIA User',
        requestId: formatRequestId(
          request.root_request_id || request.id,
          request.createdAt
        ),
        ...(process.env.EMAIL_DEBUG === '1' && {
          optional: `\n\n${JSON.stringify(request, null, 2)}\n\n${JSON.stringify(nextStatus, null, 2)}`,
        }),
      });
    }

    // Automatically create action record for revision/resubmit
    try {
      const actionService = new ActionService();
      const createdAction = await actionService.create({
        request_id: request.root_request_id || request.id,
        user_id: userExternalId,
        user_name: req.body.user_name || '',
        user_type: 'COMMERCIAL',
        federal_agency_id: undefined,
        action: action, // 'resubmit' or other action
        details: '',
        createdAt: new Date().toISOString(),
      } as ActionType);
      logBusinessEvent(
        'Action created successfully',
        'action_creation',
        'action',
        createdAction.id?.toString(),
        {
          requestId: requestId,
          userId: userExternalId,
          status: request.status,
          operation: 'createRevision',
          component: 'requests_controller',
        }
      );
    } catch (error) {
      logWithOperation(
        'warn',
        'Failed to create action record for revision',
        req,
        {
          requestId: request.id,
          error: sanitizeForLogs(String(error)),
        }
      );
      // Don't fail the entire request if action creation fails
    }

    // Respond with created request and next status
    res.status(201).json({ request, status: nextStatus.status });
  } catch (error) {
    logError(
      'Failed to create revision request',
      error as Error,
      {
        operation: 'createRevision',
        component: 'requests_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: 500,
        additionalData: {
          requestId: req.params.id,
        },
      },
      req
    );

    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create request' });
    }
  }
};

/**
 * Retrieves the latest list of requested revisions for a specific request.
 *
 * @param {Request} req - Express request object containing the request ID as a parameter.
 * @param {Response} res - Express response object used to return the list of requested revisions.
 * @returns {Promise<void>} Resolves with a JSON array of revision requests or an error message.
 */

export const getRequestedRevisions = async (req: Request, res: Response) => {
  const requestId = parseInt(req.params.id, 10);
  if (isNaN(requestId)) {
    res.status(400).json({ message: 'Invalid request ID' });
    return;
  }

  try {
    const revisions = await new RequestService().getLatestRequestedRevisions(
      requestId,
      req.query['user_id'] as string
    );
    res.status(200).json(revisions);
  } catch (error) {
    logError(
      'Failed to get requested revisions',
      error as Error,
      {
        operation: 'getRequestedRevisions',
        component: 'requests_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: 500,
        additionalData: {
          requestId: req.params.id,
        },
      },
      req
    );
    res.status(500).json({ message: 'Failed to retrieve requested revisions' });
  }
};

/**
 * Creates a new requested revision entry for a given request.
 *
 * Validates the incoming payload to ensure `requested_changes` is an array of strings.
 * Associates the changes with the specified request ID.
 *
 * @param {Request} req - Express request object containing the request ID and the requested_changes array.
 * @param {Response} res - Express response object used to return the newly created revision or an error message.
 * @returns {Promise<void>} Resolves with the created revision or an error message.
 */
export const createRequestedRevision = async (req: Request, res: Response) => {
  const requestId = parseInt(req.params.id, 10);
  const { requested_changes, user_id } = req.body;

  if (isNaN(requestId)) {
    res.status(400).json({ message: 'Invalid request ID' });
    return;
  }

  if (
    !Array.isArray(requested_changes) ||
    requested_changes.some((item) => typeof item !== 'string')
  ) {
    res
      .status(400)
      .json({ message: 'requested_changes must be an array of strings' });
    return;
  }

  if (!user_id || typeof user_id !== 'string') {
    res
      .status(400)
      .json({ message: 'user_id is required and must be a string' });
    return;
  }

  try {
    const revision = await new RequestService().createRequestedRevision(
      requestId,
      requested_changes,
      user_id
    );
    res.status(201).json(revision);
  } catch (error) {
    logError(
      'Failed to create requested revision',
      error as Error,
      {
        operation: 'createRequestedRevision',
        component: 'requests_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: 500,
        additionalData: {
          requestId: req.params.id,
          user_id,
        },
      },
      req
    );
    res.status(500).json({ message: 'Failed to create requested revision' });
  }
};

/**
 * Retrieves inquiries for a specific request ID and groups them by entity type.
 *
 * @param req - Express request object containing the request ID in `params.id`.
 * @param res - Express response object used to send the grouped inquiries.
 */
export const getInquiries = async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.id as string);
    const currentUserEmail = req.headers['x-user-email'] as string;

    const currentUser = await new UsersService().getUserByEmail(
      currentUserEmail
    );
    const currentUserEntityId = currentUser?.entity?.id;

    if (!currentUserEntityId || !currentUser?.entity) {
      res.status(400).json({ message: 'Entity ID not found for user' });
      return;
    }

    const requestService = new RequestService();
    const request = await requestService.getLatestRevisionForRequest(requestId);
    if (!request) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }

    const inquiryService = new InquiryService();
    const inquiries =
      (await inquiryService.getInquiries(requestId, currentUserEntityId)) || [];

    const allEntities = await new EntityService().getActiveEntities();
    const allowedEntityTypes =
      accessInquiry[currentUser.entity.type as keyof typeof accessInquiry];

    const requestSubmitterEntityId = request?.user?.entity?.id || null;

    // STEP 1: Filter relevant entities based on user role
    const allowedRecipientEntities = allEntities.filter((recipientEntity) => {
      if (!allowedEntityTypes.includes(recipientEntity.type)) return false;

      if (
        currentUser.entity.type === EntityEnum.NTIA &&
        recipientEntity.type === EntityEnum.COMMERCIAL
      ) {
        return recipientEntity.id === requestSubmitterEntityId;
      }

      return true;
    });

    // STEP 2: Initialize the grouped structure with null inquiries
    const inquiriesGroupedByEntityType: InquiriesGroupedByEntityType = {};

    for (const allowedRecipientEntity of allowedRecipientEntities) {
      const type = allowedRecipientEntity.type;

      if (!inquiriesGroupedByEntityType[type]) {
        inquiriesGroupedByEntityType[type] = [];
      }

      inquiriesGroupedByEntityType[type].push({
        recipientEntityName: allowedRecipientEntity.name,
        recipientEntityId: allowedRecipientEntity.id,
        inquiry: null,
      });
    }

    // STEP 3: Patch in actual inquiries
    for (const inquiry of inquiries) {
      const userIsEntityA = inquiry.entityA_id === currentUserEntityId;
      const recipientEntity = userIsEntityA ? inquiry.entityB : inquiry.entityA;

      const messages = inquiry.messages.map(({ sentAt, ...msg }) => ({
        ...msg,
        timestamp: sentAt.toISOString(),
        sender: `${msg.sender.entity.abbreviation} (${msg.sender.name})`,
        sender_entity_id: msg.sender.entity.id,
        authoredByUser: msg.sender.entity.id === currentUserEntityId,
      }));

      const index = inquiriesGroupedByEntityType[
        recipientEntity.type
      ]?.findIndex(
        (inquiryWrapper: InquiryWrapper) =>
          inquiryWrapper.recipientEntityId === recipientEntity.id
      );

      if (index !== undefined && index > -1) {
        inquiriesGroupedByEntityType[recipientEntity.type][index].inquiry = {
          id: inquiry.id,
          request_id: inquiry.request_id,
          entityA_id: inquiry.entityA_id,
          entityB_id: inquiry.entityB_id,
          messages,
        };
      }
    }

    // STEP 4: Order entity types for frontend display
    const preferredOrder = ['FEDERAL_AGENCY', 'COMMERCIAL', 'NTIA'];
    const orderedInquiriesGroupedByEntityType: InquiriesGroupedByEntityType =
      {};

    for (const entityType of preferredOrder) {
      if (inquiriesGroupedByEntityType[entityType]) {
        orderedInquiriesGroupedByEntityType[entityType] =
          inquiriesGroupedByEntityType[entityType];
      }
    }

    // Log successful retrieval with user context
    logBusinessEvent(
      'Inquiries retrieved successfully',
      'inquiry_retrieval',
      'request',
      requestId.toString(),
      {
        inquiriesCount: inquiries.length,
        entityTypesCount: Object.keys(orderedInquiriesGroupedByEntityType)
          .length,
        operation: 'getInquiries',
        component: 'requests_controller',
      },
      req
    );

    res.status(200).json(orderedInquiriesGroupedByEntityType);
  } catch (error) {
    // Structured error log with user context
    logError(
      'Error fetching inquiries',
      error as Error,
      {
        operation: 'getInquiries',
        component: 'requests_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: 500,
        additionalData: {
          requestId: req.params.id,
        },
      },
      req
    );
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Handles the creation of a new inquiry.
 *
 * Receives a inquiry object from the request body, attempts to create a new inquiry
 * using the InquiryService, and returns the created inquiry with a 201 status code.
 * If an error occurs during creation, logs the error and responds with a 500 status code.
 *
 * @param req - Express request object containing the inquiry data in the body.
 * @param res - Express response object used to send the response.
 */
export const createInquiry = async (req: Request, res: Response) => {
  const requestId = parseInt(req.params.id as string);
  const inquiry = req.body as InquiryType;

  inquiry.request_id = requestId;
  try {
    const result = await new InquiryService().create(inquiry);
    logBusinessEvent(
      'Inquiry created successfully',
      'inquiry_creation',
      'inquiry',
      result.id?.toString(),
      {
        requestId: requestId,
        userId: inquiry.entityA_id,
        operation: 'createInquiry',
        component: 'requests_controller',
      }
    );

    // Log successful inquiry creation with user context
    logBusinessEvent(
      'Inquiry created successfully',
      'inquiry_creation',
      'request',
      requestId.toString(),
      {
        inquiryId: result?.id?.toString(),
        entityA_id: result?.entityA_id?.toString(),
        entityB_id: result?.entityB_id?.toString(),
        operation: 'createInquiry',
        component: 'requests_controller',
      },
      req
    );

    res.status(201).json(result);
  } catch (error) {
    // Structured error log with user context
    logError(
      'Error creating inquiry',
      error as Error,
      {
        operation: 'createInquiry',
        component: 'requests_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: 500,
        additionalData: {
          requestId: requestId.toString(),
        },
      },
      req
    );
    res.status(500).json({ message: 'Server error while creating Inquiry' });
  }
};

/**
 * Updates an existing inquiry with the provided data.
 *
 * @param req - Express request object containing the inquiry ID in `params.id` and update data in `body`.
 * @param res - Express response object used to send the HTTP response.
 * @returns A JSON response with the updated inquiry if successful, a 404 error if not found, or a 500 error on server failure.
 */
export const updateInquiry = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const inquiryId = parseInt(req.params.inquiryId);
  delete req.body.sender_id;
  const updates: Partial<InquiryType> = req.body;
  updates.request_id = id;
  try {
    const updated = await new InquiryService().updateInquiry(
      inquiryId,
      updates
    );
    if (updated) {
      res.status(200).json(updated);
    } else {
      res.status(404).json({ message: 'Inquiry not found for update' });
    }
  } catch (error) {
    logError(
      'Server error while updating inquiry',
      error as Error,
      {
        operation: 'updateInquiry',
        component: 'inquiries_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: 500,
        additionalData: { requestId: id, inquiryId },
      },
      req
    );
    res.status(500).json({ message: 'Server error while updating Inquiry' });
  }
};

/**
 * Handles the HTTP request to retrieve a inquiry by its ID.
 *
 * @param req - Express request object containing the inquiry ID in `req.params.id`.
 * @param res - Express response object used to send the inquiry data or an error message.
 * @returns A JSON response with the inquiry data if found, a 404 error if not found, or a 500 error on server failure.
 */
export const getInquiryById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const inquiryId = parseInt(req.params.inquiryId);
  try {
    const inquiry = await new InquiryService().getInquiryById(id, inquiryId);
    if (inquiry) {
      res.status(200).json(inquiry);
    } else {
      res.status(404).json({ message: 'Inquiry not found' });
    }
  } catch (error) {
    logError(
      'Failed to retrieve inquiry by ID',
      error as Error,
      {
        operation: 'getInquiryById',
        component: 'inquiries_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: 500,
      },
      req
    );
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Handles the creation of a new message within a specific inquiry.
 *
 * @param req - Express request object containing the inquiry ID in the route parameters and the message data in the body.
 * @param res - Express response object used to send the HTTP response.
 * @returns Sends a 201 status with the created message on success, 404 if the inquiry is not found, or 500 on server error.
 */
export const createMessage = async (req: Request, res: Response) => {
  const requestId = parseInt(req.params.id);
  const inquiryId = parseInt(req.params.inquiryId);

  if (!isNaN(inquiryId) && inquiryId !== undefined && inquiryId > 0) {
    // Case 1: Inquiry already exists
    const inquiry = await new InquiryService().getInquiryById(
      requestId,
      inquiryId
    );
    if (!inquiry) {
      res.status(404).json({ message: 'Inquiry not found' });
      return;
    }

    const message = { inquiry_id: inquiry.id, ...req.body } as MessageType;

    try {
      const result = await new InquiryService().createMessage(message);
      res.status(201).json(result);
    } catch (error) {
      logError(
        'Server error while creating message',
        error as Error,
        {
          operation: 'createMessage',
          component: 'inquiries_controller',
          operationType: OperationType.HTTP_REQUEST,
          httpStatusCode: 500,
        },
        req
      );
      res.status(500).json({ message: 'Server error while creating message' });
    }
  } else {
    // Case 2: No inquiry exists — create first
    const currentUserEmail = req.headers['x-user-email'] as string;
    const user = await new UsersService().getUserByEmail(currentUserEmail);
    const senderEntityId = user?.entity?.id;

    if (!senderEntityId) {
      res.status(400).json({ message: 'Could not determine sender entity' });
      return;
    }

    const recipientEntityId = req.body.recipient_entity_id;
    if (!recipientEntityId) {
      res.status(400).json({ message: 'Missing recipient entity ID' });
      return;
    }

    const newInquiry: InquiryType = {
      request_id: requestId,
      entityA_id: senderEntityId,
      entityB_id: recipientEntityId,
      messages: [],
      closedAt: undefined,
      closedBy_id: undefined,
      createdAt: new Date().toISOString(),
      closed: false,
    };

    try {
      const created = await new InquiryService().create(newInquiry);
      logBusinessEvent(
        'Inquiry created successfully',
        'inquiry_creation',
        'inquiry',
        created.id?.toString(),
        {
          requestId: requestId,
          userId: senderEntityId,
          operation: 'createMessage',
          component: 'requests_controller',
        }
      );
      const inquiry = convertInquiryPrismaToOpenAPI(created);

      const message = { inquiry_id: inquiry.id, ...req.body } as MessageType;

      const result = await new InquiryService().createMessage(message);
      res.status(201).json(result);
    } catch (error) {
      logError(
        'Server error while creating inquiry/message',
        error as Error,
        {
          operation: 'createMessage',
          component: 'inquiries_controller',
          operationType: OperationType.HTTP_REQUEST,
          httpStatusCode: 500,
        },
        req
      );
      res
        .status(500)
        .json({ message: 'Server error while creating inquiry/message' });
    }
  }
};

/**
 * Middleware to verify the entities involved in an inquiry.
 * This function checks if both entities exist, validates their types,
 * and ensures that the sender's entity is allowed to create an inquiry with the target entity.
 * If any validation fails, it responds with an error.
 *
 * @param req - Express request object containing the inquiry data in the body.
 * @param res - Express response object used to send the response.
 * @param next - Express next function to pass control to the next middleware.
 */
export const verifyEntities = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const inquiry = req.body as InquiryType;
  if (!inquiry.entityA_id || !inquiry.entityB_id) {
    res.status(400).json({ message: 'Missing entity IDs in inquiry' });
    return;
  }

  const currentUserEmail = req.headers['x-user-email'] as string;
  try {
    const userA = await new UsersService().getUserByEmail(currentUserEmail);
    if (!userA) {
      logWithOperation('warn', 'User with email not found', null, {
        userEmail: sanitizeForLogs(currentUserEmail),
      });
      throw new Error(`User with email ${currentUserEmail} not found`);
    }

    const entityA = userA?.entity;
    //set the entityA_id in the request body from user's entity
    req.body.entityA_id = entityA?.id;

    if (!entityA) {
      res.status(400).json({ message: "Sender's entity not found" });
      return;
    }

    if (!Object.values(EntityEnum).find((v) => v === entityA.type)) {
      res.status(400).json({ message: "Invalid sender's entity" });
      return;
    }

    const entityService = new EntityService();

    const entityB = await entityService.getEntityById(inquiry.entityB_id);
    if (!entityB) {
      res.status(400).json({ message: 'Target entity not found' });
      return;
    }

    if (!Object.values(EntityEnum).find((v) => v === entityB.type)) {
      res.status(400).json({ message: 'Invalid target entity' });
      return;
    }

    if (!accessInquiry[entityA.type]?.includes(entityB.type)) {
      res.status(400).json({
        message: `User's entity ${entityA} not allowed to create inquiry with entity ${entityB}`,
      });
      return;
    }

    next();
  } catch (error) {
    logError(
      'Error verifying entities',
      error as Error,
      {
        operation: 'verifyEntities',
        component: 'inquiries_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: 400,
      },
      req
    );
  }
};

/**
 * Middleware to verify the entity of the user making the request.
 * This function checks if the user exists, retrieves their entity,
 * and validates the entity type. If any validation fails, it responds with an error.
 *
 * @param req - Express request object containing the message data in the body.
 * @param res - Express response object used to send the response.
 * @param next - Express next function to pass control to the next middleware.
 */
export const verifyEntity = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const msg = req.body as MessageType;

  const currentUserEmail = req.headers['x-user-email'] as string;
  try {
    const user = await new UsersService().getUserByEmail(currentUserEmail);
    const entityId = user?.entity?.id;
    if (!entityId) {
      res.status(400).json({ message: 'Entity ID not found for user' });
      return;
    }
    if (!user) {
      logWithOperation('warn', 'User with email not found', null, {
        userEmail: sanitizeForLogs(currentUserEmail),
      });
      throw new Error(`User with email ${currentUserEmail} not found`);
    }
    req.body.sender_id = user.id;

    const entityService = new EntityService();
    const entity = await entityService.getEntityByUserId(msg.sender_id);

    if (!entity) {
      res.status(404).json({ message: 'Entity not found' });
      return;
    }

    if (!Object.values(EntityEnum).find((v) => v === entity.type)) {
      res.status(400).json({ message: 'Invalid entity' });
      return;
    }

    next();
  } catch (error) {
    logError(
      'Error verifying entity',
      error as Error,
      {
        operation: 'verifyEntity',
        component: 'inquiries_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: 400,
      },
      req
    );
  }
};

/**
 * Retrieves all requests pending approval and processes an approval for a specific request.
 *
 * @param req - Express request object containing the user ID and optional filters.
 * @param res - Express response object used to send the response.
 * @returns A JSON response with the list of pending approval requests or the result of the approval process.
 */
export const handleApprovalPendingRequests = async (days: number) => {
  const successfulApprovals: { requestId: number; nextStatus: string }[] = [];
  try {
    const now = new Date();
    const businessDate = subBusinessDays(now, days);
    const daysAgo = differenceInCalendarDays(now, businessDate);

    const requestService = new RequestService();
    const pendingRequests =
      await requestService.getApprovalPendingRequests(daysAgo);
    if (pendingRequests?.length === 0) {
      if (process.env.LOGGING_VERBOSE === 'true') {
        logBusinessEvent(
          `No requests pending approval for more than ${days} business days.`,
          'cron_job',
          null,
          null,
          {
            operation: 'handleApprovalPendingRequests',
            component: 'requests_controller',
          }
        );
      }
    }

    for (const pendingRequest of pendingRequests) {
      try {
        const approval: ApprovalType = {
          request_id: pendingRequest.id,
          user_id: ntiaAutoApprovalUserId,
          condition: `Auto Approved due to inactivity for ${days} business days`,
          date_approved: new Date().toISOString(),
        };

        const { errors, nextStatus } = await requestApproval(
          pendingRequest.id,
          ntiaAutoApprovalUserId,
          'slfcp_admin@ntia.gov',
          'NTIA',
          'auto_approve',
          approval
        );

        if (errors) {
          logError(
            `Errors occurred while processing request ID ${sanitizeForLogs(pendingRequest.id.toString())}:`,
            new Error(sanitizeForLogs(String(errors))),
            {
              operation: 'handleApprovalPendingRequests',
              component: 'inquiries_controller',
              operationType: OperationType.BUSINESS_LOGIC,
            }
          );
        } else {
          if (process.env.LOGGING_VERBOSE === 'true') {
            logBusinessEvent(
              `Successfully processed approval for request ID ${pendingRequest.id}. Next status: ${nextStatus?.status} `,
              'cron_job',
              null,
              null,
              {
                operation: 'handleApprovalPendingRequests',
                component: 'requests_controller',
              }
            );
          }
          if (nextStatus?.status) {
            successfulApprovals.push({
              requestId: pendingRequest.id,
              nextStatus: nextStatus.status,
            });
          }
        }
      } catch (error) {
        logError(
          `Failed to process approval for request ID ${sanitizeForLogs(pendingRequest.id.toString())}:`,
          error as Error,
          {
            operation: 'handleApprovalPendingRequests',
            component: 'requests_controller',
            operationType: OperationType.BUSINESS_LOGIC,
          }
        );
      }
    }
  } catch (error) {
    logError('Error fetching pending approval requests', error as Error, {
      operation: 'handleApprovalPendingRequests',
      component: 'requests_controller',
      operationType: OperationType.BUSINESS_LOGIC,
    });
  }
  return successfulApprovals;
};

/**
 * Marks all messages in an inquiry as read by the current user.
 * @param req - Express request object containing the inquiry ID in the route parameters.
 * @param res - Express response object used to send the HTTP response.
 * @returns Sends a 200 status on success, 404 if the inquiry is not found, or 500 on server error.
 */
export const markInquiryMessagesAsRead = async (
  req: Request,
  res: Response
) => {
  try {
    const requestId = parseInt(req.params.id);
    const inquiryId = parseInt(req.params.inquiryId);
    const currentUserEmail = req.headers['x-user-email'] as string;

    if (isNaN(requestId) || isNaN(inquiryId)) {
      res.status(400).json({ error: 'Invalid request ID or inquiry ID' });
      return;
    }

    // Get the current user
    const user = await new UsersService().getUserByEmail(currentUserEmail);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Verify the inquiry exists
    const inquiry = await new InquiryService().getInquiryById(
      requestId,
      inquiryId
    );
    if (!inquiry) {
      res.status(404).json({ error: 'Inquiry not found' });
      return;
    }

    // Mark all messages in the inquiry as read
    const messageReadStatusService = new MessageReadStatusService();
    await messageReadStatusService.markAllInquiryMessagesAsRead(
      inquiryId,
      user.id
    );

    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    logError(
      'Error marking inquiry messages as read',
      error as Error,
      {
        operation: 'markInquiryMessagesAsRead',
        component: 'requests_controller',
        operationType: OperationType.HTTP_REQUEST,
      },
      req
    );
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Marks a specific message as read by the current user.
 * @param req - Express request object containing the message ID in the route parameters.
 * @param res - Express response object used to send the HTTP response.
 * @returns Sends a 200 status on success, 404 if the message is not found, or 500 on server error.
 */
export const markMessageAsRead = async (req: Request, res: Response) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const currentUserEmail = req.headers['x-user-email'] as string;

    if (isNaN(messageId)) {
      res.status(400).json({ error: 'Invalid message ID' });
      return;
    }

    // Get the current user
    const user = await new UsersService().getUserByEmail(currentUserEmail);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Mark the message as read
    const messageReadStatusService = new MessageReadStatusService();
    await messageReadStatusService.markMessageAsRead(messageId, user.id);

    res.status(200).json({ message: 'Message marked as read' });
  } catch (error) {
    logError(
      'Error marking message as read',
      error as Error,
      {
        operation: 'markMessageAsRead',
        component: 'requests_controller',
        operationType: OperationType.HTTP_REQUEST,
      },
      req
    );
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Sends reminder emails for pending concurrence and approval requests.
 *
 * This function performs the following tasks:
 * 1. Retrieves requests pending concurrence and sends reminder emails to the respective agencies.
 * 2. Retrieves requests pending NTIA approval and sends reminder emails to the NTIA entity.
 * 3. Logs appropriate messages for each operation and handles errors gracefully.
 * 4. Sends all queued emails using the `EmailService`.
 *
 * @async
 * @function
 * @returns {Promise<{ message: string }[]>} A promise that resolves to an array of reminder messages.
 *
 * @throws Will log errors if:
 * - Retrieving pending concurrence requests fails.
 * - Retrieving agencies pending concurrence for a specific request fails.
 * - Retrieving pending NTIA approval requests fails.
 * - Sending an email fails.
 */
export const sendPendingConcurrenceAndApprovalReminders = async () => {
  const emailQueue: emailQueueType[] = [];
  const reminders: { message: string }[] = [];
  try {
    const requestService = new RequestService();
    const pendingConcurrencesRequests: { id: number; createdAt: Date }[] =
      await requestService.getPendingConcurrenceRequests();
    if (pendingConcurrencesRequests?.length === 0) {
      if (process.env.LOGGING_VERBOSE === 'true') {
        logBusinessEvent(
          `No requests pending concurrence action.`,
          'cron_job',
          null,
          null,
          {
            operation: 'sendPendingConcurrenceAndApprovalReminders',
            component: 'requests_controller',
            operationType: OperationType.BUSINESS_LOGIC,
          }
        );
      }
    }

    for (const pendingRequest of pendingConcurrencesRequests) {
      try {
        const entities = await requestService.getAgenciesPendingConcurrences(
          pendingRequest.id
        );
        for (const entity of entities) {
          //send reminder email to each entity
          emailQueue.push({
            template: ntiaConcurrenceReminderEmailTemplate,
            params: {
              entityIds: [entity.id],
              userName: `${entity.name} User`,
              requestId: formatRequestId(
                pendingRequest.id,
                pendingRequest.createdAt
              ),
              ...(process.env.EMAIL_DEBUG === '1' && {
                optional: `\n\n${JSON.stringify(pendingRequest, null, 2)}`,
              }),
            },
            logMessage: `Reminder sent to ${entity.name} for request ID ${pendingRequest.id}`,
          });
        }
      } catch (error) {
        logError(
          `Failed to retrieve agencies pending concurrence for request ID ${sanitizeForLogs(pendingRequest.id.toString())}:`,
          error as Error,
          {
            operation: 'sendPendingConcurrenceAndApprovalReminders',
            component: 'requests_controller',
            operationType: OperationType.BUSINESS_LOGIC,
          }
        );
      }
    }

    try {
      const pendingNTIAApprovalRequests: { id: number; createdAt: Date }[] =
        await requestService.getPendingNTIAApprovalRequests();
      if (pendingConcurrencesRequests?.length === 0) {
        logWithOperation(
          'info',
          'No requests pending NTIA Approval found.',
          null,
          {
            operation: 'sendPendingConcurrenceAndApprovalReminders',
            component: 'requests_controller',
            operationType: OperationType.BUSINESS_LOGIC,
          }
        );
      }

      for (const request of pendingNTIAApprovalRequests) {
        //send reminder email to NTIA
        emailQueue.push({
          template: ntiaApprovalReminderEmailTemplate,
          params: {
            entityIds: [(await getNTIAEntity()).id],
            userName: 'NTIA User',
            requestId: formatRequestId(request.id, request.createdAt),
            ...(process.env.EMAIL_DEBUG === '1' && {
              optional: `\n\n${JSON.stringify(request, null, 2)}`,
            }),
          },
          logMessage: `Reminder sent to ${(await getNTIAEntity()).name} for request ID ${request.id}`,
        });
      }
    } catch (error) {
      logError(
        `Failed to retrieve pending approvals for NTIA:`,
        error as Error,
        {
          operation: 'sendPendingConcurrenceAndApprovalReminders',
          component: 'requests_controller',
          operationType: OperationType.BUSINESS_LOGIC,
        }
      );
    }
  } catch (error) {
    logError('Error fetching pending requests:', error as Error, {
      operation: 'sendPendingConcurrenceAndApprovalReminders',
      component: 'requests_controller',
      operationType: OperationType.BUSINESS_LOGIC,
    });
  }

  for (const job of emailQueue) {
    try {
      await EmailService.sendEnhancedNotification(job.template, job.params);
      reminders.push({ message: job.logMessage });
    } catch (error) {
      logError(
        `Failed to send email: ${sanitizeForLogs(job.logMessage)}`,
        error as Error,
        {
          operation: 'sendPendingConcurrenceAndApprovalReminders',
          component: 'requests_controller',
          operationType: OperationType.EMAIL,
        }
      );
    }
  }

  return reminders;
};
