import { BackendRequestStatus, RequestStatusGroup } from '../../../types';

export const statusesByStatusGroup: Record<
  RequestStatusGroup,
  BackendRequestStatus[]
> = {
  [RequestStatusGroup.Approved]: ['APPROVED'],
  [RequestStatusGroup.Denied]: ['DENIED'],
  [RequestStatusGroup.RevisionsRequested]: [
    'UNDER_INITIAL_REVISION_PER_NTIA',
    'UNDER_FINAL_REVISION_PER_NTIA',
  ],
  [RequestStatusGroup.ApprovedWithConditions]: ['APPROVED_WITH_CONDITIONS'],
  [RequestStatusGroup.Submitted]: ['SUBMITTED'],
  [RequestStatusGroup.UnderReview]: [
    'UNDER_NTIA_INITIAL_REVIEW',
    'UNDER_FEDERAL_AGENCIES_REVIEW',
    'UNDER_NTIA_FINAL_REVIEW',
  ],
};
