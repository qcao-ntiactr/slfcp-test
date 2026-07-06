import { UserRole } from '../../context/HybridAuthContext';
import {
  BackendCommonConditionStatus,
  BackendRequestStatus,
  RequestStatusGroup,
} from '../../types';
import { EntityType } from '../Inquiries/types';

/**
 * Formats a status group (uppercase with underscores) into a UI friendly string
 * @param {RequestStatusGroup} status - The status group that the request falls under
 * @returns {string} A formatted string representing the request status group
 */
export const getFilterBtnLabel = (status: RequestStatusGroup) => {
  const formattedStatus = status
    .split('_')

    .join(' ');
  if (
    status === RequestStatusGroup.RevisionsRequested ||
    status === RequestStatusGroup.UnderReview
  ) {
    return formattedStatus;
  } else {
    return `REQUEST ${formattedStatus}`;
  }
};

/**
 * Formats a common condition status into a UI friendly string
 * @param {BackendCommonConditionStatus} status - Backend common condition status
 * @returns {string} A formatted string representing the common condition status
 */
export const getCommonConditionStatusLabel = (
  status: BackendCommonConditionStatus
) => {
  switch (status) {
    case 'DRAFT':
      return 'DRAFT';
    case 'SUBMITTED':
      return 'UNDER REVIEW';
    case 'REJECTED':
      return 'DENIED';
    case 'PUBLISHED':
      return 'PUBLISHED';
    default:
      throw new Error(`Unrecognized common condition status: ${status}`);
  }
};

/**
 * Changes a numerical request ID into the format SLFCP-XXXXX-YYYY where X represents the id with 0s padding the left
 * @param {number} requestId - The request ID from the database
 * @param {string | Date} createdAt - Optional creation date used for the year
 * @returns {string} A formatted string representing the request ID
 */
export const formatRequestId = (
  requestId: number,
  createdAt?: string | Date
) => {
  const year = createdAt
    ? new Date(createdAt).getUTCFullYear()
    : new Date().getFullYear();
  return `SLFCP-${requestId.toString().padStart(5, '0')}-${year}`;
};

/**
 * Changes a numerical request draft ID into the format SLFCP-DRAFT-XXXXX where X represents the id with 0s padding the left
 * @param {number} requestId - The request draft ID from the database
 * @returns {string} A formatted string representing the request draft ID
 */
export const formatRequestDraftId = (requestDraftId: number) => {
  return `SLFCP-DRAFT-${requestDraftId.toString().padStart(5, '0')}`;
};

/**
 * Maps backend request statuses to status groups that are used in the UI
 * @param {BackendRequestStatus} status - Backend request status
 * @returns {RequestStatusGroup} The status group that the request falls under
 */
export const mapStatusToStatusGroup = (
  status: BackendRequestStatus
): RequestStatusGroup => {
  switch (status) {
    case 'UNDER_NTIA_INITIAL_REVIEW':
    case 'UNDER_FEDERAL_AGENCIES_REVIEW':
    case 'UNDER_NTIA_FINAL_REVIEW':
      return RequestStatusGroup.UnderReview;
    case 'UNDER_INITIAL_REVISION_PER_NTIA':
    case 'UNDER_FINAL_REVISION_PER_NTIA':
      return RequestStatusGroup.RevisionsRequested;
    case 'SUBMITTED':
      return RequestStatusGroup.Submitted;
    case 'APPROVED':
      return RequestStatusGroup.Approved;
    case 'APPROVED_WITH_CONDITIONS':
      return RequestStatusGroup.ApprovedWithConditions;
    case 'DENIED':
      return RequestStatusGroup.Denied;
    default:
      throw new Error(`Unrecognized backend status: ${status}`);
  }
};

/**
 * Takes an array of frequency values and formats them into a string for Request and Request Draft Tables
 * @param {number[]} frequencies - An array of the frequency value from each frequency in the request
 * @returns {string} Frequency values concatenated by semi colons
 */
export const formatFrequencies = (frequencies?: number[]): string => {
  if (!frequencies) return '';
  return frequencies?.map((freq) => freq.toString()).join('; ');
};

/**
 * Maps UserRole to EntityType - These represent the same information, but are formatted differently
 * @param {UserRole} userRole - The user's role from authentication
 * @returns {EntityType} The type of the entity the user belongs to based on their role
 */
export const convertUserRoleToEntityType = (userRole: UserRole): EntityType => {
  switch (userRole) {
    case UserRole.commercial:
      return 'COMMERCIAL';
    case UserRole.federal:
      return 'FEDERAL_AGENCY';
    case UserRole.ntia:
      return 'NTIA';
  }
};
