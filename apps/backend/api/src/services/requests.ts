import { Prisma, StatusEnum as StatusEnumType } from '@prisma/client';
import { eachDayOfInterval, isWeekend } from 'date-fns';

import { components } from '../types/requests.js';
import prisma from '../utils/database.js';
import { sanitizeForLogs } from '../utils/sanitize.js';
import { logError, logWithOperation } from '../utils/structuredLogger.js';

import { UsersService } from './users.js';
import { MessageReadStatusService } from './messageReadStatus.js';
import { ReceiverType } from './requestDrafts.js';
import {
  buildRequestFilterConditions,
  buildRequestOrderBy,
  mergeRequestSerialNumberSortRows,
  RequestFilterRule,
  RequestListSortDirection,
  RequestListSortKey,
} from './requestListQuery.js';

export type RequestType = components['schemas']['Request'];
export type RequestDetails = components['schemas']['RequestDetails'];
export type RequestSummary = components['schemas']['RequestSummary'];
// Keep the list query include and RequestWithFrequencies payload type in sync.
const requestWithFrequenciesInclude = Prisma.validator<Prisma.RequestInclude>()(
  {
    frequencies: true,
    user: {
      include: {
        entity: true,
      },
    },
  }
);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const requestWithFrequencies = Prisma.validator<Prisma.RequestDefaultArgs>()({
  include: requestWithFrequenciesInclude,
});
type RequestCreate = Prisma.RequestCreateInput;
type RequestUpdate = Prisma.RequestUpdateInput;
export type RequestWithFrequencies = Prisma.RequestGetPayload<
  typeof requestWithFrequencies
>;
export type RequestTypePrisma = RequestType & {
  ecf_cartesian_vectors_format_file_path: string;
  ground_track_of_launch_vehicle_2d_img_file_path: string;
};

export type RequestWithUnreadCount = RequestWithFrequencies & {
  unreadMessageCount?: number;
};
export const StatusEnum = StatusEnumType;

interface RequestListOptions {
  page: number;
  pageSize: number;
  statuses?: string[];
  unread?: boolean;
  search?: string;
  userExternalId?: string;
  sortBy?: RequestListSortKey;
  sortDirection?: RequestListSortDirection;
  filterRules?: RequestFilterRule[];
  timezone?: string;
  referenceDate?: string;
}

const findRequestsSortedBySerialNumber = async ({
  whereClause,
  page,
  pageSize,
  sortDirection,
}: {
  whereClause: Prisma.RequestWhereInput;
  page: number;
  pageSize: number;
  sortDirection?: RequestListSortDirection;
}) =>
  prisma.$transaction(async (tx) => {
    const direction = sortDirection || 'desc';
    const offset = (page - 1) * pageSize;
    const rowsNeededForPage = offset + pageSize;

    const [unrevisedRows, revisedRows, count] = await Promise.all([
      tx.request.findMany({
        where: { AND: [whereClause, { root_request_id: null }] },
        select: { id: true, root_request_id: true },
        orderBy: [{ id: direction }],
        take: rowsNeededForPage,
      }),
      tx.request.findMany({
        where: { AND: [whereClause, { root_request_id: { not: null } }] },
        select: { id: true, root_request_id: true },
        orderBy: [{ root_request_id: direction }, { id: 'desc' }],
        take: rowsNeededForPage,
      }),
      tx.request.count({ where: whereClause }),
    ]);

    const pageRows = mergeRequestSerialNumberSortRows(
      unrevisedRows,
      revisedRows,
      direction,
      rowsNeededForPage
    ).slice(offset);
    const pageIds = pageRows.map((request) => request.id);
    const pageRequests = pageIds.length
      ? await tx.request.findMany({
          where: { id: { in: pageIds } },
          include: requestWithFrequenciesInclude,
        })
      : [];
    const pageRequestsById = new Map(
      pageRequests.map((request) => [request.id, request])
    );

    return {
      data: pageIds
        .map((id) => pageRequestsById.get(id))
        .filter((request): request is RequestWithFrequencies =>
          Boolean(request)
        ),
      count,
    };
  });

/**
 * Converts a Prisma request object to an OpenAPI-compatible request details object.
 * @function convertRequestPrismaToOpenAPI
 * @param {RequestWithFrequencies} prismaRequest - The Prisma request object containing request data.
 * @returns {Promise<RequestDetails>} The transformed request object formatted according to the OpenAPI schema.
 * @description Maps the database request format to the API response format, including frequency details.
 */
export async function convertRequestPrismaToOpenAPI(
  prismaRequest: RequestWithFrequencies
): Promise<RequestDetails> {
  // Get external user ID
  const externalUserId = prismaRequest.user_id
    ? await new UsersService().getUserExternalId(prismaRequest.user_id)
    : null;

  return {
    ...prismaRequest,
    root_request_id:
      prismaRequest.root_request_id === null
        ? undefined
        : prismaRequest.root_request_id,
    fcc_filing_date: prismaRequest.fcc_filing_date?.toISOString(),
    mission_name: prismaRequest.mission_name,
    launch_datetime_primary:
      prismaRequest.launch_datetime_primary.toISOString(),
    launch_datetime_backup: prismaRequest.launch_datetime_backup.toISOString(),
    latitude: prismaRequest.latitude.toNumber(),
    longitude: prismaRequest.longitude.toNumber(),
    createdAt: prismaRequest.createdAt?.toISOString(),
    updatedAt: prismaRequest.updatedAt?.toISOString(),
    ecf_cartesian_vectors_format_file: '',
    ground_track_of_launch_vehicle_2d_img_file: '',
    frequencies: prismaRequest.frequencies?.length
      ? prismaRequest.frequencies.map((prismaFrequency) => ({
          id: prismaFrequency.id,
          request_id: prismaFrequency.request_id,
          frequency: prismaFrequency.frequency.toNumber(),
          location_of_transmitter_on_vehicle_or_platform:
            prismaFrequency.location_of_transmitter_on_vehicle_or_platform,
          eirp: prismaFrequency.eirp.toNumber(),
          eirp_unit: prismaFrequency.eirp_unit,
          transmitted_bandwidth:
            prismaFrequency.transmitted_bandwidth.toNumber(),
          transmitted_bandwidth_is_signal_filtered:
            prismaFrequency.transmitted_bandwidth_is_signal_filtered,
          transmitted_bandwidth_justification:
            prismaFrequency.transmitted_bandwidth_justification,
          minus_3db_bandwidth: prismaFrequency.minus_3db_bandwidth.toNumber(),
          minus_3db_bandwidth_before_or_after_filtering:
            prismaFrequency.minus_3db_bandwidth_before_or_after_filtering,
          minus_20db_bandwidth: prismaFrequency.minus_20db_bandwidth.toNumber(),
          minus_20db_bandwidth_before_or_after_filtering:
            prismaFrequency.minus_20db_bandwidth_before_or_after_filtering,
          minus_60db_bandwidth: prismaFrequency.minus_60db_bandwidth.toNumber(),
          minus_60db_bandwidth_before_or_after_filtering:
            prismaFrequency.minus_60db_bandwidth_before_or_after_filtering,
          nature_of_modulating_signals:
            prismaFrequency.nature_of_modulating_signals,
          emission_designator: prismaFrequency.emission_designator,
          tx_transmission_start:
            prismaFrequency.tx_transmission_start.toISOString(),
          tx_transmission_end:
            prismaFrequency.tx_transmission_end.toISOString(),
          tx_antenna_type: prismaFrequency.tx_antenna_type,
          tx_antenna_gain: prismaFrequency.tx_antenna_gain,
          tx_antenna_beamwidth: prismaFrequency.tx_antenna_beamwidth,
          tx_antenna_altitude: prismaFrequency.tx_antenna_altitude,
          tx_antenna_altitude_unit: prismaFrequency.tx_antenna_altitude_unit,
          receivers: Array.isArray(prismaFrequency.receivers)
            ? (prismaFrequency.receivers as ReceiverType[]).map(
                (receiver: ReceiverType) => {
                  const txStart = receiver.transmission_start
                    ? new Date(receiver.transmission_start)
                    : null;
                  const txEnd = receiver.transmission_end
                    ? new Date(receiver.transmission_end)
                    : null;

                  return {
                    ...receiver,
                    transmission_start:
                      txStart && !isNaN(txStart.getTime())
                        ? txStart.toISOString()
                        : '',
                    transmission_end:
                      txEnd && !isNaN(txEnd.getTime())
                        ? txEnd.toISOString()
                        : '',
                  };
                }
              )
            : [],
          createdAt: prismaFrequency.createdAt?.toISOString(),
          updatedAt: prismaFrequency.updatedAt?.toISOString(),
        }))
      : [],
    // Use external user ID
    user_id: externalUserId ?? '',
  };
}

/**
 * Converts an OpenAPI request object to a Prisma-compatible format.
 * @function convertRequestOpenAPIToPrisma
 * @param {RequestType} request - The OpenAPI request object.
 * @param {string} mode - The operation mode ('create' or 'update').
 * @param {number} userId - Optional user ID to associate with the request.
 * @returns {RequestCreate} The transformed request data formatted for Prisma.
 * @description This function maps the OpenAPI request schema to the Prisma ORM schema, ensuring proper type conversion
 * and structure for database insertion.
 */
export function convertRequestOpenAPIToPrisma(
  request: RequestTypePrisma,
  mode: 'create' | 'update' = 'create',
  userId?: number
): RequestCreate | RequestUpdate {
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ecf_cartesian_vectors_format_file,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ground_track_of_launch_vehicle_2d_img_file,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    user_id,
    ...requestPrisma
  } = request;

  const commonData = {
    ...requestPrisma,
    ...(mode === 'create' && userId && { user_id: userId }),
    fcc_filing_date: request.fcc_filing_date
      ? new Date(request.fcc_filing_date)
      : null,
    latitude: new Prisma.Decimal(request.latitude),
    longitude: new Prisma.Decimal(request.longitude),
    launch_datetime_primary: new Date(request.launch_datetime_primary),
    launch_datetime_backup: new Date(request.launch_datetime_backup),
    read: request.read ?? false,
  };

  const mappedFrequencies = request.frequencies.map((freq) => ({
    frequency: new Prisma.Decimal(freq.frequency),
    location_of_transmitter_on_vehicle_or_platform:
      freq.location_of_transmitter_on_vehicle_or_platform,
    eirp: new Prisma.Decimal(freq.eirp),
    eirp_unit: freq.eirp_unit,
    transmitted_bandwidth: new Prisma.Decimal(freq.transmitted_bandwidth),
    transmitted_bandwidth_is_signal_filtered:
      freq.transmitted_bandwidth_is_signal_filtered,
    transmitted_bandwidth_justification:
      freq.transmitted_bandwidth_justification,
    minus_3db_bandwidth: new Prisma.Decimal(freq.minus_3db_bandwidth),
    minus_3db_bandwidth_before_or_after_filtering:
      freq.minus_3db_bandwidth_before_or_after_filtering,
    minus_20db_bandwidth: new Prisma.Decimal(freq.minus_20db_bandwidth),
    minus_20db_bandwidth_before_or_after_filtering:
      freq.minus_20db_bandwidth_before_or_after_filtering,
    minus_60db_bandwidth: new Prisma.Decimal(freq.minus_60db_bandwidth),
    minus_60db_bandwidth_before_or_after_filtering:
      freq.minus_60db_bandwidth_before_or_after_filtering,
    nature_of_modulating_signals: freq.nature_of_modulating_signals,
    emission_designator: freq.emission_designator,
    tx_transmission_start: new Date(freq.tx_transmission_start),
    tx_transmission_end: new Date(freq.tx_transmission_end),
    tx_antenna_type: freq.tx_antenna_type,
    tx_antenna_gain: freq.tx_antenna_gain,
    tx_antenna_beamwidth: freq.tx_antenna_beamwidth,
    tx_antenna_altitude: freq.tx_antenna_altitude,
    tx_antenna_altitude_unit: freq.tx_antenna_altitude_unit,
    receivers: freq.receivers,
  }));

  const frequencies =
    mode === 'create'
      ? { create: mappedFrequencies }
      : {
          update: request.frequencies.map((freq, index) => {
            if (!freq.id) {
              throw new Error(
                `Missing frequency ID for update at index ${index}`
              );
            }
            return {
              where: { id: freq.id },
              data: mappedFrequencies[index],
            };
          }),
        };

  return {
    ...commonData,
    frequencies,
  };
}

/**
 * Calculates the number of business days between two dates, excluding weekends.
 * @function businessDaysDiff
 * @param {Date} startDate - The start date of the interval.
 * @param {Date} endDate - The end date of the interval.
 * @returns {number} The number of business days between the two dates, excluding weekends.
 */
function businessDaysDiff(startDate: Date, endDate: Date): number {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  return days.filter((day) => !isWeekend(day)).length - 1; // exclude start day
}

/**
 * A service class to handle requests using Prisma ORM.
 */
export class RequestService {
  /**
   * Validates that only COMMERCIAL users can create or update requests.
   */
  async validateUserCanModifyRequests(userId: number): Promise<void> {
    // Get the user with their entity information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { entity: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Only COMMERCIAL users can create or update requests
    if (user.entity.type !== 'COMMERCIAL') {
      throw new Error('Only COMMERCIAL users can create or update requests');
    }
  }

  /**
   * Validates user access to view requests based on their entity type.
   * - COMMERCIAL users can only view requests created by their own entity
   * - NTIA and FEDERAL_AGENCY users can view all requests
   */
  async validateUserCanViewRequest(
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

    // NTIA and FEDERAL_AGENCY users can view all requests
    if (user.entity.type === 'NTIA' || user.entity.type === 'FEDERAL_AGENCY') {
      return;
    }

    // COMMERCIAL users can only view requests from their own entity
    if (user.entity.type === 'COMMERCIAL') {
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
          'Only COMMERCIAL users can view requests created by the same entity'
        );
      }
    }
  }

  /**
   * Creates a new request in the database.
   * @async
   * @function create
   * @param {RequestType} request - The request data to be created.
   * @returns {Promise<Object>} The created request object.
   * @throws {Error} Throws an error if the request creation fails.
   */
  async create(request: RequestTypePrisma) {
    try {
      const user = await new UsersService().getUserByExternalId(
        request.user_id
      );
      if (!user) {
        logWithOperation('warn', 'User not found for request creation', null, {
          userExternalId: sanitizeForLogs(request.user_id),
        });
        throw new Error(`User with external ID ${request.user_id} not found`);
      }

      // Validate that user can create requests
      await this.validateUserCanModifyRequests(user.id);

      const prismaData = convertRequestOpenAPIToPrisma(
        request,
        'create',
        user.id
      );

      // Create the request in the database
      const createdRequest = await prisma.request.create({
        data: prismaData as RequestCreate,
      });
      return createdRequest;
    } catch (error) {
      logError('Error creating request', error as Error, {
        operation: 'create',
        component: 'requests_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error; // Re-throw the error for the caller to handle
    }
  }

  /**
   * Retrieves all requests from the database.
   * For COMMERCIAL users, filters to show only requests from their own entity.
   * - COMMERCIAL users can only view requests created by their own entity
   * - NTIA and FEDERAL_AGENCY users can view all requests
   * @async
   * @function getRequests
   * @returns {Promise<Array<Object>>} A list of all requests.
   * @throws {Error} Throws an error if the requests fetching fails.
   */
  getRequests = async (options: RequestListOptions) => {
    try {
      const {
        page,
        pageSize,
        statuses,
        unread,
        search,
        userExternalId,
        sortBy,
        sortDirection,
        filterRules = [],
        timezone,
        referenceDate,
      } = options;
      const andConditions: Prisma.RequestWhereInput[] = [];
      andConditions.push({ current_revision: true });

      const statusFilters = statuses?.filter((s): s is StatusEnumType =>
        Object.values(StatusEnum).includes(s as StatusEnumType)
      );
      if (statusFilters?.length) {
        andConditions.push({ status: { in: statusFilters } });
      }

      if (typeof unread === 'boolean') {
        andConditions.push({ read: !unread });
      }

      if (search) {
        andConditions.push({
          OR: [
            { name_of_licensee: { contains: search, mode: 'insensitive' } },
            { call_sign: { contains: search, mode: 'insensitive' } },
          ],
        });
      }

      andConditions.push(
        ...buildRequestFilterConditions(filterRules, timezone, referenceDate)
      );

      // Apply entity-based filtering based on entity type
      if (userExternalId) {
        const user = await new UsersService().getUserByExternalId(
          userExternalId
        );
        if (!user) {
          logWithOperation('warn', 'User not found for getRequests', null, {
            userExternalId: sanitizeForLogs(userExternalId),
          });
          throw new Error(`User with external ID ${userExternalId} not found`);
        }

        const userWithEntity = await prisma.user.findUnique({
          where: { id: user.id },
          include: { entity: true },
        });

        if (!userWithEntity) {
          throw new Error('User entity information not found');
        }

        if (userWithEntity.entity.type === 'COMMERCIAL') {
          // COMMERCIAL users can only see requests from their own entity
          andConditions.push({
            user: {
              entity_id: userWithEntity.entity_id,
            },
          });
        }
        // NTIA and FEDERAL_AGENCY users can see all requests (no additional filter needed)
      }

      const whereClause: Prisma.RequestWhereInput = andConditions.length
        ? { AND: andConditions }
        : {};

      const { data, count } =
        sortBy === 'id'
          ? await findRequestsSortedBySerialNumber({
              whereClause,
              page,
              pageSize,
              sortDirection,
            })
          : await prisma.$transaction(async (tx) => {
              const [requests, totalCount] = await Promise.all([
                tx.request.findMany({
                  where: whereClause,
                  skip: (page - 1) * pageSize,
                  take: pageSize,
                  orderBy: buildRequestOrderBy(sortBy, sortDirection),
                  include: requestWithFrequenciesInclude,
                }),
                tx.request.count({ where: whereClause }),
              ]);

              return { data: requests, count: totalCount };
            });

      return {
        page,
        pageSize,
        data,
        totalCount: count,
        totalPages: Math.ceil(count / pageSize),
      };
    } catch (error) {
      logError('Error fetching requests', error as Error, {
        operation: 'getRequests',
        component: 'requests_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  };

  /**
   * Retrieves all requests with unread message counts for a specific user.
   * For COMMERCIAL users, filters to show only requests from their own entity.
   * - COMMERCIAL users can only view requests created by their own entity
   * - NTIA and FEDERAL_AGENCY users can view all requests
   * @async
   * @function getRequestsWithUnreadCounts
   * @returns {Promise<Array<Object>>} A list of all requests with unread message counts.
   * @throws {Error} Throws an error if the requests fetching fails.
   */
  getRequestsWithUnreadCounts = async (options: RequestListOptions) => {
    try {
      // First get the regular requests
      const requestsResult = await this.getRequests(options);

      // If no user is provided, return requests without unread counts
      if (!options.userExternalId) {
        return requestsResult;
      }

      // Get the user ID from external ID
      const user = await new UsersService().getUserByExternalId(
        options.userExternalId
      );
      if (!user) {
        return requestsResult;
      }

      // Get request IDs for unread count lookup
      const requestIds = requestsResult.data.map(
        (request) => request.root_request_id || request.id
      );

      // Get unread message counts for these requests
      const messageReadStatusService = new MessageReadStatusService();
      const unreadCounts =
        await messageReadStatusService.getUnreadMessageCountsForRequests(
          user.id,
          requestIds
        );

      // Combine requests with unread counts (only include unreadMessageCount if > 0)
      const requestsWithUnreadCounts: RequestWithUnreadCount[] =
        requestsResult.data.map((request) => {
          const unreadCount =
            unreadCounts[request.root_request_id || request.id] || 0;
          const result: RequestWithUnreadCount = { ...request };

          // Only include unreadMessageCount if it's greater than 0
          if (unreadCount > 0) {
            result.unreadMessageCount = unreadCount;
          }

          return result;
        });

      return {
        ...requestsResult,
        data: requestsWithUnreadCounts,
      };
    } catch (error) {
      logError('Error fetching requests with unread counts', error as Error, {
        operation: 'getRequestsWithUnreadCounts',
        component: 'requests_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  };

  /**
   * Retrieves a specific request by its ID from the database.
   * - COMMERCIAL users can only view their own requests
   * - NTIA and FEDERAL_AGENCY users can view all requests
   * @async
   * @function getLatestRevisionForRequest
   * @param {number} id - The ID of the root request to fetch.
   * @param {string} userExternalId - The external ID of the user requesting access.
   * @returns {Promise<Object | null>} The request object if found, or null if not.
   * @throws {Error} Throws an error if the request fetching fails.
   */
  async getLatestRevisionForRequest(id: number, userExternalId?: string) {
    try {
      const request = await prisma.request.findFirst({
        where: {
          AND: [
            { current_revision: true },
            { OR: [{ id: id }, { root_request_id: id }] },
          ],
        },
        include: {
          frequencies: true,
          user: {
            include: {
              entity: true,
            },
          },
        },
      });

      if (!request) {
        logWithOperation('warn', 'Request not found', null, {
          requestId: id,
        });
        return null;
      }

      // Validate user can view this request
      if (userExternalId) {
        const user = await new UsersService().getUserByExternalId(
          userExternalId
        );
        if (!user) {
          logWithOperation(
            'warn',
            'User not found for getRequestRevision',
            null,
            {
              userExternalId: sanitizeForLogs(userExternalId),
            }
          );
          throw new Error(`User with external ID ${userExternalId} not found`);
        }
        await this.validateUserCanViewRequest(user.id, request.id);
      }

      return request;
    } catch (error) {
      logError('Error fetching request revision', error as Error, {
        operation: 'getLatestRevisionForRequest',
        component: 'requests_services',
        additionalData: {
          requestId: sanitizeForLogs(id.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  /**
   * Updates an existing request in the database by its ID.
   *
   * This method finds the current revision of a request (either by its `id` or `root_request_id`)
   * and updates it with the provided data. If the current revision is not found, it logs a warning
   * and returns `null`. If the update is successful, it returns the updated request object.
   *
   * @param id - The unique identifier of the request to update.
   * @param request - The request data to update, in the OpenAPI format.
   * @returns The updated request object if successful, or `null` if not found.
   * @throws Will throw an error if the update operation fails.
   */
  async putRequest(id: number, request: RequestTypePrisma) {
    try {
      const prismaData = convertRequestOpenAPIToPrisma(request, 'update');

      const requestId = await prisma.request.findFirst({
        where: {
          AND: [
            { current_revision: true },
            { OR: [{ id: id }, { root_request_id: id }] },
          ],
        },
        include: {
          frequencies: true,
          user: {
            include: {
              entity: true,
            },
          },
        },
      });
      if (!requestId) {
        logWithOperation('warn', 'Current revision not found', null, {
          requestId: id,
        });
        return null;
      }
      const result = await prisma.request.update({
        where: { id: requestId?.id },
        data: prismaData as RequestUpdate,
      });
      if (!result) {
        logWithOperation('warn', 'Request not found', null, {
          requestId: id,
        });
        return null;
      }
      return result;
    } catch (error) {
      logError('Error updating request', error as Error, {
        operation: 'putRequest',
        component: 'requests_services',
        additionalData: {
          requestId: sanitizeForLogs(id.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  /**
   * Updates the status of an existing request without user validation.
   * This method is intended for internal status updates where user validation is not required.
   * @async
   * @function updateRequestStatus
   * @param {number} id - The ID of the request to update.
   * @param {StatusEnumType} status - The new status to set.
   * @returns {Promise<Object | null>} The updated request object if successful, or null if not found.
   * @throws {Error} Throws an error if the update operation fails.
   */
  async updateRequestStatus(id: number, status: StatusEnumType) {
    try {
      const requestId = await prisma.request.findFirst({
        where: {
          AND: [
            { current_revision: true },
            { OR: [{ id: id }, { root_request_id: id }] },
          ],
        },
      });

      if (!requestId) {
        logWithOperation('warn', 'Current revision not found', null, {
          requestId: id,
        });
        return null;
      }

      const result = await prisma.request.update({
        where: { id: requestId.id },
        data: { status },
      });

      if (!result) {
        logWithOperation('warn', 'Request not found', null, {
          requestId: id,
        });
        return null;
      }

      return result;
    } catch (error) {
      logError('Error updating request status', error as Error, {
        operation: 'updateRequestStatus',
        component: 'requests_services',
        additionalData: {
          requestId: sanitizeForLogs(id.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  /**
   * Updates the current_revision flag of an existing request without user validation.
   * This method is intended for internal revision management.
   * @async
   * @function updateRequestRevisionFlag
   * @param {number} id - The ID of the request to update.
   * @param {boolean} currentRevision - The new current_revision flag value.
   * @returns {Promise<Object | null>} The updated request object if successful, or null if not found.
   * @throws {Error} Throws an error if the update operation fails.
   */
  async updateRequestRevisionFlag(id: number, currentRevision: boolean) {
    try {
      const result = await prisma.request.update({
        where: { id },
        data: { current_revision: currentRevision },
      });

      if (!result) {
        logWithOperation('warn', 'Request not found', null, {
          requestId: id,
        });
        return null;
      }

      return result;
    } catch (error) {
      logError('Error updating request revision flag', error as Error, {
        operation: 'updateRequestRevisionFlag',
        component: 'requests_services',
        additionalData: {
          requestId: sanitizeForLogs(id.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  /**
   * Creates a new revision of a request in the database.
   *
   * Converts the provided request object from the OpenAPI format to the Prisma format,
   * then inserts it into the database as a new request record.
   *
   * @param request - The request object in OpenAPI format to be converted and stored.
   * @returns A promise that resolves to the newly created request record.
   * @throws Will throw an error if the creation process fails.
   */
  async createRevision(request: RequestTypePrisma) {
    try {
      const user = await new UsersService().getUserByExternalId(
        request.user_id
      );
      if (!user) {
        logWithOperation('warn', 'User not found for request revision', null, {
          userExternalId: sanitizeForLogs(request.user_id),
        });
        throw new Error(`User with external ID ${request.user_id} not found`);
      }

      // Validate that user can create requests (revisions)
      await this.validateUserCanModifyRequests(user.id);

      const prismaData = convertRequestOpenAPIToPrisma(
        request,
        'create',
        user.id
      );

      // Create the request in the database
      const createdRequest = await prisma.request.create({
        data: prismaData as RequestCreate,
      });
      return createdRequest;
    } catch (error) {
      logError('Error creating request revision', error as Error, {
        operation: 'createRevision',
        component: 'requests_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error; // Re-throw the error for the caller to handle
    }
  }

  /**
   * Retrieves the latest requested revision for a given request ID.
   * For COMMERCIAL users, validates access to the request first.
   * - COMMERCIAL users can only view requested revisions for requests created by their own entity
   * - NTIA and FEDERAL_AGENCY users can view requested revisions for all requests
   *
   * This function queries the `requestedRevision` table for the most recent
   * revision associated with the given `requestId`, ordered by `createdAt` in descending order.
   *
   * @param requestId - The unique identifier of the request.
   * @param userExternalId - The external ID of the user requesting access.
   * @returns A Promise that resolves to the latest requested revision, or `null` if none exist.
   * @throws Logs and rethrows any errors encountered during the database query.
   */
  async getLatestRequestedRevisions(
    requestId: number,
    userExternalId?: string
  ) {
    try {
      // If userExternalId is provided, validate user access and filter by entity
      if (userExternalId) {
        const user = await new UsersService().getUserByExternalId(
          userExternalId
        );
        if (!user) {
          logWithOperation(
            'warn',
            'User not found for getLatestRequestedRevisions',
            null,
            {
              userExternalId: sanitizeForLogs(userExternalId),
            }
          );
          throw new Error(`User with external ID ${userExternalId} not found`);
        }

        const userWithEntity = await prisma.user.findUnique({
          where: { id: user.id },
          include: { entity: true },
        });

        if (!userWithEntity) {
          throw new Error('User entity information not found');
        }

        if (userWithEntity.entity.type === 'COMMERCIAL') {
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
              'Users can only view requested revisions for requests created by the same entity'
            );
          }
        }
        // NTIA and FEDERAL_AGENCY users can see all requested revisions, so no restriction applied
      }

      const latestRevision = await prisma.requestedRevision.findFirst({
        where: { request_id: requestId },
        orderBy: { createdAt: 'desc' },
      });

      if (!latestRevision) {
        logWithOperation('info', 'No requested revisions found', null, {
          requestId: requestId,
        });
        return null;
      }

      logWithOperation('info', 'Fetched latest requested revision', null, {
        requestId: requestId,
        revisionId: latestRevision.id,
      });
      return latestRevision;
    } catch (error) {
      logError('Error fetching latest requested revisions', error as Error, {
        operation: 'getLatestRequestedRevisions',
        component: 'requests_services',
        additionalData: {
          requestId: sanitizeForLogs(requestId.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  /**
   * Creates a new requested revision entry for a specific request.
   *
   * This function inserts a new record into the `requestedRevision` table with
   * the specified `requestId`, `requestedChanges`, and `userId`.
   * Only NTIA users are allowed to create requested revisions.
   *
   * @param requestId - The ID of the request for which the revision is being created.
   * @param requestedChanges - An array of strings describing the requested changes.
   * @param userExternalId - The external ID of the user creating the revision.
   * @returns A Promise that resolves to the newly created requested revision entry.
   * @throws Logs and rethrows any errors encountered during the creation process.
   */
  async createRequestedRevision(
    requestId: number,
    requestedChanges: string[],
    userExternalId: string
  ) {
    try {
      // Get user by external ID
      const user = await new UsersService().getUserByExternalId(userExternalId);
      if (!user) {
        logWithOperation('warn', 'User with external id not found', null, {
          userExternalId: sanitizeForLogs(userExternalId),
        });
        throw new Error(`User with external ID ${userExternalId} not found`);
      }

      // Validate that user is NTIA type
      if (user.entity.type !== 'NTIA') {
        logWithOperation(
          'warn',
          'Non-NTIA user attempted to create requested revision',
          null,
          {
            userExternalId: sanitizeForLogs(userExternalId),
            entityType: sanitizeForLogs(user.entity.type),
          }
        );
        throw new Error('Only NTIA users can create requested revisions');
      }

      const newRevision = await prisma.requestedRevision.create({
        data: {
          request_id: requestId,
          user_id: user.id,
          requested_changes: requestedChanges,
        },
      });

      logWithOperation('info', 'Created new requested revision', null, {
        requestId: sanitizeForLogs(requestId.toString()),
        revisionId: sanitizeForLogs(newRevision.id.toString()),
        userExternalId: sanitizeForLogs(userExternalId),
      });

      // Convert to include external user ID for response
      const externalUserId = await new UsersService().getUserExternalId(
        user.id
      );

      return {
        ...newRevision,
        user_id: externalUserId ?? '',
      };
    } catch (error) {
      logError('Error creating requested revision', error as Error, {
        operation: 'createRequestedRevision',
        component: 'requests_services',
        additionalData: {
          requestId: sanitizeForLogs(requestId.toString()),
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  /**
   * Retrieves all requests that are pending approval for more than a specified number of calendar days.
   * This method checks for requests that have been under NTIA initial review for more than the specified number of days.
   *
   * @param {number} days - The number of calendar days to check for pending approval.
   * @returns {Promise<Array<Object>>} A list of requests pending approval.
   * @throws {Error} Throws an error if the database query fails.
   */
  async getApprovalPendingRequests(days: number) {
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);
      daysAgo.setHours(0, 0, 0, 0); // Normalize to midnight

      const requests = await prisma.request.findMany({
        where: {
          AND: [
            {
              status: StatusEnumType.UNDER_NTIA_INITIAL_REVIEW,
              createdAt: {
                lte: daysAgo,
              },
            },
          ],
        },
      });
      if (requests.length === 0) {
        logWithOperation(
          'info',
          'No requests pending approval for specified days',
          null,
          {
            days: days,
          }
        );
        return [];
      }
      return requests;
    } catch (error) {
      logError('Error fetching approval pending requests', error as Error, {
        operation: 'getApprovalPendingRequests',
        component: 'requests_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  /**
   * Retrieves all requests that are pending concurrence actions.
   * This method checks for requests that have been under federal agencies review
   * for more than 8 business days, or 1 or 2/4/6 business days if the request was created
   * on a weekend.
   *
   * @returns {Promise<Array<Object>>} A list of requests pending concurrence actions.
   * @throws {Error} Throws an error if the database query fails.
   */
  async getPendingConcurrenceRequests(): Promise<
    { id: number; createdAt: Date }[]
  > {
    try {
      const requestsWithLatestApproval = await prisma.request.findMany({
        where: {
          current_revision: true,
          status: 'UNDER_FEDERAL_AGENCIES_REVIEW',
        },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const matchingRequestIds = requestsWithLatestApproval
        .filter((r) => {
          if (!r.createdAt) return false;

          const bizDaysDiff = businessDaysDiff(r.createdAt, today);
          if (bizDaysDiff >= 8) {
            return true;
          }
          return (
            bizDaysDiff !== 0 && (bizDaysDiff % 2 === 0 || bizDaysDiff === 1)
          );
        })
        .map((r) => r.id);

      // Query requests with those IDs and other conditions
      const requests = await prisma.request.findMany({
        where: {
          id: { in: matchingRequestIds },
          current_revision: true,
          status: 'UNDER_FEDERAL_AGENCIES_REVIEW',
        },
        select: { id: true, createdAt: true },
        distinct: ['id'],
      });

      if (requests.length === 0) {
        logWithOperation(
          'info',
          'No requests pending concurrence action',
          null
        );
        return [];
      }
      return requests;
    } catch (error) {
      logError('Error fetching pending concurrence requests', error as Error, {
        operation: 'getPendingConcurrenceRequests',
        component: 'requests_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  /**
   * Retrieves all federal agencies that have pending concurrence actions for a specific request.
   * This method checks for agencies that have users who have not yet concurred on the request.
   *
   * @param {number} requestId - The ID of the request to check for pending concurrences.
   * @returns {Promise<Array<Object>>} A list of federal agencies with pending concurrence actions.
   * @throws {Error} Throws an error if the database query fails.
   */
  async getAgenciesPendingConcurrences(requestId: number) {
    try {
      const entities = await prisma.entity.findMany({
        where: {
          type: 'FEDERAL_AGENCY',
          active: true,
          users: {
            none: {
              concurrences: {
                some: {
                  request: {
                    id: requestId,
                  },
                  user: {
                    entity: {
                      active: true,
                      type: 'FEDERAL_AGENCY',
                    },
                  },
                },
              },
            },
          },
        },
        include: {
          users: {
            include: {
              concurrences: {
                include: {
                  request: true,
                  user: {
                    include: {
                      entity: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (entities.length === 0) {
        logWithOperation(
          'info',
          `No agency pending concurrence action for request ${requestId}.`
        );
        return [];
      }
      return entities;
    } catch (error) {
      logError('Error fetching agencies pending concurrences', error as Error, {
        operation: 'getAgenciesPendingConcurrences',
        component: 'requests_services',
        additionalData: {
          error: sanitizeForLogs(String(error)),
        },
      });
      throw error;
    }
  }

  /**
   * Retrieves all requests that are pending NTIA approval actions.
   * This method checks for requests that have been under NTIA review
   * for more than 8 business days, or 1 or 2/4/6 business days if the request was created
   * on a weekend.
   *
   * @returns {Promise<Array<Object>>} A list of requests pending NTIA approval actions.
   * @throws {Error} Throws an error if the database query fails.
   */
  async getPendingNTIAApprovalRequests(): Promise<
    { id: number; createdAt: Date }[]
  > {
    try {
      const pendingNTIAApprovalRequests = await prisma.request.findMany({
        where: {
          current_revision: true,
          status: {
            in: ['UNDER_NTIA_INITIAL_REVIEW', 'UNDER_NTIA_FINAL_REVIEW'],
          },
        },
        select: {
          id: true,
          createdAt: true,
        },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const matchingRequestIds = pendingNTIAApprovalRequests
        .filter((r) => {
          if (!r.createdAt) return false;

          const bizDaysDiff = businessDaysDiff(r.createdAt, today);
          return (
            bizDaysDiff !== 0 && (bizDaysDiff % 2 === 0 || bizDaysDiff === 1)
          );
        })
        .map((r) => r.id);

      // Query requests with those IDs and other conditions
      const requests = await prisma.request.findMany({
        where: {
          id: { in: matchingRequestIds },
          current_revision: true,
          status: {
            in: ['UNDER_NTIA_INITIAL_REVIEW', 'UNDER_NTIA_FINAL_REVIEW'],
          },
        },
        select: { id: true, createdAt: true },
      });

      if (requests.length === 0) {
        logWithOperation('info', `No requests pending NTIA approval action.`);
        return [];
      }
      return requests;
    } catch (error) {
      logError(
        'Error fetching pending NTIA approval requests',
        error as Error,
        {
          operation: 'getPendingNTIAApprovalRequests',
          component: 'requests_services',
          additionalData: {
            error: sanitizeForLogs(String(error)),
          },
        }
      );
      throw error;
    }
  }
}
