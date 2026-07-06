import { Request, Response, RequestHandler, Express } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { BlobServiceClient } from '@azure/storage-blob';
import { Frequency } from '@prisma/client';

import { RequestDraftService } from '../services/requestDrafts.js';
import { UsersService } from '../services/users.js';
import { extractAndOverrideUserId } from '../utils/userExtraction.js';
import { sanitizeForLogs } from '../utils/sanitize.js';
import { safeParseInt, safeParseJSON } from '../utils/safeParse.js';
import {
  logBusinessEvent,
  logError,
  OperationType,
  logWithOperation,
} from '../utils/structuredLogger.js';

import { downloadBlobAndConvertToBase64 } from './requests.js';
import {
  azureBlobStorageConnectionString,
  azureBlobContainerName,
} from './../config.js';

const service = new RequestDraftService();

/**
 * Deletes a blob from the configured Azure Blob Storage container, if it exists.
 *
 * @async
 * @function deleteBlob
 * @param {string} blobName - The name of the blob to delete (typically the file name with UUID).
 * @returns {Promise<void>} Resolves once deletion is attempted. Logs success or error internally.
 *
 * @description
 * This function checks for the existence of a configured Azure Storage connection string.
 * If found, it constructs a BlobServiceClient and attempts to delete the specified blob
 * from the Azure container. Errors are caught and logged, but not thrown.
 */
async function deleteBlob(blobName: string): Promise<void> {
  if (!azureBlobStorageConnectionString) {
    logWithOperation('error', 'Azure Storage Connection string not found');
    return;
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(
    azureBlobStorageConnectionString
  );
  const containerClient = blobServiceClient.getContainerClient(
    azureBlobContainerName
  );
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  try {
    await blockBlobClient.deleteIfExists();
    logWithOperation('info', 'Deleted blob', null, {
      blobName: sanitizeForLogs(blobName),
    });
  } catch (error) {
    logError('Error deleting blob', error as Error, {
      operation: 'deleteBlob',
      component: 'requests_draft_controller',
      additionalData: {
        blobName: sanitizeForLogs(blobName),
        error: sanitizeForLogs(String(error)),
      },
    });
  }
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

      logWithOperation('info', 'Upload block blob successfully', req, {
        blobName: sanitizeForLogs(blobName),
        requestId: uploadBlobResponse.requestId,
      });
      return `${blobName}`;
    } catch (error) {
      logError(
        'Error uploading file',
        error as Error,
        {
          operation: 'store_file',
          component: 'requests_draft_controller',
        },
        req
      );
    }
  })();
}

/**
 * Retrieves all request drafts with entity-based filtering and pagination support.
 * COMMERCIAL users see only drafts from their own entity.
 * NTIA and FEDERAL_AGENCY users see all drafts.
 *
 * @route GET /request-drafts
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @returns {void}
 */
export const getRequestDrafts: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    // Use authenticated user's ID instead of trusting query parameter
    const userExternalId = extractAndOverrideUserId(req);

    const user = await new UsersService().getUserByExternalId(userExternalId);
    if (!user) {
      logWithOperation('warn', 'User not found', req, {
        userExternalId: sanitizeForLogs(userExternalId),
      });
      throw new Error(`User with external ID ${userExternalId} not found`);
    }

    const result = await service.getRequestDrafts(page, pageSize, user.id);

    const { data, ...params } = result;

    // Convert to include external user IDs
    const draftsWithExternalIds = await Promise.all(
      data.map(async (draft) => {
        const externalUserId = draft.user_id
          ? await new UsersService().getUserExternalId(draft.user_id)
          : null;
        return {
          ...draft,
          user_id: externalUserId ?? '',
        };
      })
    );

    const drafts = draftsWithExternalIds.map((draft) => {
      const { frequencies, ...otherFields } = draft;
      return {
        ...otherFields,
        frequencies: Array.isArray(frequencies)
          ? frequencies.map(({ frequency }) => frequency)
          : frequencies,
      };
    });

    // Log successful retrieval with user context
    logBusinessEvent(
      'Request drafts retrieved successfully',
      'request_draft_retrieval',
      'user',
      userExternalId,
      {
        draftsCount: drafts.length,
        page: page,
        pageSize: pageSize,
        totalCount: params.totalCount,
        operation: 'getRequestDrafts',
        component: 'request_drafts_controller',
      },
      req
    );

    res.status(200).json({ ...params, data: drafts });
  } catch (error) {
    // Structured error log with user context
    logError(
      'Error fetching request drafts',
      error as Error,
      {
        operation: 'getRequestDrafts',
        component: 'request_drafts_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode: 500,
      },
      req
    );
    res.status(500).json({ error: 'Failed to fetch request drafts' });
  }
};

/**
 * Handles the creation of a new request draft.
 * Uploads associated files to Azure Blob Storage,
 * parses form fields, and stores the draft in the database.
 *
 * @route POST /request-drafts
 * @param {Request} req - Express request object containing multipart form data.
 * @param {Response} res - Express response object.
 * @returns {void}
 */
export const createRequestDraft: RequestHandler = async (
  req: Request,
  res: Response
) => {
  // Use authenticated user's ID instead of trusting query parameter
  const userExternalId = extractAndOverrideUserId(req);
  try {
    // Validate user can view this draft
    const user = await new UsersService().getUserByExternalId(userExternalId);
    if (!user) {
      logWithOperation('warn', 'User not found', req, {
        userExternalId: sanitizeForLogs(userExternalId),
      });
      throw new Error(`User with external ID ${userExternalId} not found`);
    }
    await service.validateUserCanModifyRequestDrafts(user.id);

    // Store uploaded files if they exist
    const fileFields = {
      ecf_cartesian_vectors_format_file_path:
        'ecf_cartesian_vectors_format_file',
      ground_track_of_launch_vehicle_2d_img_file_path:
        'ground_track_of_launch_vehicle_2d_img_file',
    };

    for (const key in fileFields) {
      const field = fileFields[key];
      if (req.files?.[field]) {
        req.body[key] = await storeFile(req, field);
      }
    }

    // Parse form data
    const parsedFreqs = safeParseJSON<Frequency[]>(req.body.frequencies);
    if (parsedFreqs) req.body.frequencies = parsedFreqs;

    const parsedNum = safeParseInt(req.body.number_of_frequencies);
    if (parsedNum !== undefined) req.body.number_of_frequencies = parsedNum;

    if (
      req.body.fcc_filing_date === '' ||
      req.body.fcc_filing_date === 'null'
    ) {
      req.body.fcc_filing_date = null;
    }

    // Create the draft with user_id
    const draft = await service.createRequestDraft(user.id, req.body);

    // Log successful draft creation with user context
    logBusinessEvent(
      'Request draft created successfully',
      'request_draft_creation',
      'user',
      userExternalId,
      {
        draftId: draft?.id?.toString(),
        hasFiles: !!(req.files && Object.keys(req.files).length > 0),
        numberOfFrequencies: req.body.number_of_frequencies,
        operation: 'createRequestDraft',
        component: 'request_drafts_controller',
      },
      req
    );

    res.status(201).json({ ...draft, user_id: userExternalId });
  } catch (error) {
    // Structured error log with user context
    logError(
      'Error creating request draft',
      error as Error,
      {
        operation: 'createRequestDraft',
        component: 'request_drafts_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode:
          error instanceof Error &&
          error.message.includes('Only COMMERCIAL users')
            ? 403
            : error instanceof Error && error.message.includes('not found')
              ? 404
              : 500,
      },
      req
    );
    if (error instanceof Error) {
      if (error.message.includes('Only COMMERCIAL users')) {
        res.status(403).json({ error: error.message });
      } else if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create request draft' });
      }
    } else {
      res.status(500).json({ error: 'Failed to create request draft' });
    }
  }
};

/**
 * Retrieves a request draft by its ID and includes base64 file content
 * for the uploaded files if available.
 *
 * @route GET /request-drafts/:id
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @returns {void}
 */
export const getRequestDraftById: RequestHandler = async (
  req: Request,
  res: Response
) => {
  const id = parseInt(req.params.id);
  // Use authenticated user's ID instead of trusting query parameter
  const userExternalId = extractAndOverrideUserId(req);
  try {
    // Validate user exists and can view this draft
    if (!userExternalId) {
      logWithOperation(
        'warn',
        'User ID not provided for request draft retrieval',
        null,
        {
          draftId: id,
        }
      );
      throw new Error('User authentication required');
    }

    const user = await new UsersService().getUserByExternalId(userExternalId);
    if (!user) {
      logWithOperation(
        'warn',
        'User not found for request draft retrieval',
        null,
        {
          userExternalId: sanitizeForLogs(userExternalId),
          draftId: id,
        }
      );
      throw new Error(`User with external ID ${userExternalId} not found`);
    }

    await service.validateUserCanViewRequestDraft(user.id, id);

    const draft = await service.getRequestDraftById(id);
    if (!draft) {
      res.status(404).json({ error: 'Request draft not found' });
    } else {
      // Convert files to base64 if file paths exist
      const ecfBase64 = draft.ecf_cartesian_vectors_format_file_path
        ? await downloadBlobAndConvertToBase64(
            draft.ecf_cartesian_vectors_format_file_path
          )
        : undefined;

      const gtBase64 = draft.ground_track_of_launch_vehicle_2d_img_file_path
        ? await downloadBlobAndConvertToBase64(
            draft.ground_track_of_launch_vehicle_2d_img_file_path
          )
        : undefined;

      // Convert to include external user ID
      const userExternalId = draft.user_id
        ? await new UsersService().getUserExternalId(draft.user_id)
        : null;

      // Log successful retrieval with user context
      logBusinessEvent(
        'Request draft retrieved successfully',
        'request_draft_retrieval_by_id',
        'draft',
        id.toString(),
        {
          hasEcfFile: !!draft.ecf_cartesian_vectors_format_file_path,
          hasGtFile: !!draft.ground_track_of_launch_vehicle_2d_img_file_path,
          operation: 'getRequestDraftById',
          component: 'request_drafts_controller',
        },
        req
      );

      // Return draft with base64-encoded files inline
      res.status(200).json({
        ...draft,
        user_id: userExternalId ?? '',
        ecf_cartesian_vectors_format_file: ecfBase64,
        ground_track_of_launch_vehicle_2d_img_file: gtBase64,
      });
    }
  } catch (error) {
    // Structured error log with user context
    logError(
      'Error fetching request draft by ID',
      error as Error,
      {
        operation: 'getRequestDraftById',
        component: 'request_drafts_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode:
          error instanceof Error && error.message.includes('same entity')
            ? 403
            : error instanceof Error && error.message.includes('not found')
              ? 404
              : 500,
        additionalData: {
          draftId: id.toString(),
        },
      },
      req
    );
    if (error instanceof Error) {
      if (error.message.includes('same entity')) {
        res.status(403).json({ error: error.message });
      } else if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to fetch request draft' });
      }
    } else {
      res.status(500).json({ error: 'Failed to fetch request draft' });
    }
  }
};

/**
 * Deletes a request draft by ID.
 * Also deletes associated files from Azure Blob Storage.
 *
 * @route DELETE /request-drafts/:id
 * @param {Request} req - Express request object with the draft ID.
 * @param {Response} res - Express response object.
 * @returns {void}
 */
export const deleteRequestDraftById: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  // Use authenticated user's ID instead of trusting query parameter
  const userExternalId = extractAndOverrideUserId(req);

  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid ID format' });
    return;
  }

  if (!userExternalId) {
    res.status(400).json({ error: 'user_id query parameter is required' });
    return;
  }

  try {
    // Get the user and validate they can delete request drafts
    const user = await new UsersService().getUserByExternalId(userExternalId);
    if (!user) {
      logWithOperation('warn', 'User not found', req, {
        userExternalId: sanitizeForLogs(userExternalId),
      });
      throw new Error(`User with external ID ${userExternalId} not found`);
    }

    await service.validateUserCanModifyRequestDrafts(user.id);
    await service.validateUserCanViewRequestDraft(user.id, id);

    const draft = await service.getRequestDraftById(id);

    if (draft.ecf_cartesian_vectors_format_file_path) {
      await deleteBlob(draft.ecf_cartesian_vectors_format_file_path);
    }
    if (draft.ground_track_of_launch_vehicle_2d_img_file_path) {
      await deleteBlob(draft.ground_track_of_launch_vehicle_2d_img_file_path);
    }

    await service.deleteRequestDraftById(id);

    // Log successful deletion with user context
    logBusinessEvent(
      'Request draft deleted successfully',
      'request_draft_deletion',
      'draft',
      id.toString(),
      {
        hadEcfFile: !!draft.ecf_cartesian_vectors_format_file_path,
        hadGtFile: !!draft.ground_track_of_launch_vehicle_2d_img_file_path,
        operation: 'deleteRequestDraftById',
        component: 'request_drafts_controller',
      },
      req
    );

    res.status(204).send(); // No Content
  } catch (error) {
    // Structured error log with user context
    logError(
      'Error deleting request draft',
      error as Error,
      {
        operation: 'deleteRequestDraftById',
        component: 'request_drafts_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode:
          error instanceof Error &&
          (error.message.includes('Only COMMERCIAL users') ||
            error.message.includes('same entity'))
            ? 403
            : error instanceof Error && error.message.includes('not found')
              ? 404
              : 500,
        additionalData: {
          draftId: id.toString(),
        },
      },
      req
    );
    if (error instanceof Error) {
      if (
        error.message.includes('Only COMMERCIAL users') ||
        error.message.includes('same entity')
      ) {
        res.status(403).json({ error: error.message });
      } else if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete request draft' });
      }
    } else {
      res.status(500).json({ error: 'Failed to delete request draft' });
    }
  }
};

/**
 * Updates a request draft by ID.
 * Deletes and re-uploads blobs if files are reattached.
 * Parses incoming form fields and updates both metadata and frequencies.
 *
 * @route PUT /request-drafts/:id
 * @param {Request} req - Express request object with updated data and optional files.
 * @param {Response} res - Express response object.
 * @returns {void}
 */
export const updateRequestDraftById: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const userExternalId = extractAndOverrideUserId(req);

    const user = await new UsersService().getUserByExternalId(userExternalId);
    if (!user) {
      return res
        .status(404)
        .json({ error: `User with external ID ${userExternalId} not found` });
    }

    await service.validateUserCanModifyRequestDrafts(user.id);
    await service.validateUserCanViewRequestDraft(user.id, id);

    const draft = await service.getRequestDraftById(id);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    if (draft.ecf_cartesian_vectors_format_file_path) {
      await deleteBlob(draft.ecf_cartesian_vectors_format_file_path);
    }

    if (files?.['ecf_cartesian_vectors_format_file']) {
      if (draft.ground_track_of_launch_vehicle_2d_img_file_path) {
        await deleteBlob(draft.ground_track_of_launch_vehicle_2d_img_file_path);
      }
      req.body.ecf_cartesian_vectors_format_file_path = await storeFile(
        req,
        'ecf_cartesian_vectors_format_file'
      );
    }

    if (files?.['ground_track_of_launch_vehicle_2d_img_file']) {
      req.body.ground_track_of_launch_vehicle_2d_img_file_path =
        await storeFile(req, 'ground_track_of_launch_vehicle_2d_img_file');
    }

    if (req.body.frequencies && typeof req.body.frequencies === 'string') {
      req.body.frequencies = JSON.parse(req.body.frequencies);
    }
    if (req.body.number_of_frequencies) {
      req.body.number_of_frequencies = Number.parseInt(
        req.body.number_of_frequencies
      );
    }

    if (
      req.body.fcc_filing_date === '' ||
      req.body.fcc_filing_date === 'null'
    ) {
      req.body.fcc_filing_date = null;
    }

    const updated = await service.updateRequestDraftById(id, user.id, req.body);

    return res.status(200).json({ ...updated, user_id: userExternalId });
  } catch (error) {
    logError(
      'Error in request drafts controller',
      error as Error,
      {
        operation: 'createRequestDraftById',
        component: 'request_drafts_controller',
        operationType: OperationType.HTTP_REQUEST,
        httpStatusCode:
          (error instanceof Error &&
            error.message.includes('Only COMMERCIAL users')) ||
          error.message.includes('same entity')
            ? 403
            : error instanceof Error && error.message.includes('not found')
              ? 404
              : 500,
      },
      req
    );
    if (error instanceof Error) {
      if (
        error.message.includes('Only COMMERCIAL users') ||
        error.message.includes('same entity')
      ) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
    }
    return res.status(500).json({ error: 'Failed to update request draft' });
  }
};
