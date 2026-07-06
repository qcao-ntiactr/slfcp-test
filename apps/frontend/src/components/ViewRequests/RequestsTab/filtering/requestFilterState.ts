import {
  BackendRequestStatus,
  RequestListFilterRule,
  RequestListFilters,
  RequestStatusGroup,
} from '../../../../types';
import { statusesByStatusGroup } from '../StatusesByStatusGroup';

export const getBrowserTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export const getFilterRuleForField = (
  filters: RequestListFilters,
  field: RequestListFilterRule['field']
) => filters.filterRules?.find((rule) => rule.field === field);

export const setFilterRule = (
  filters: RequestListFilters,
  filterRule: RequestListFilterRule
): RequestListFilters => ({
  ...filters,
  page: 1,
  filterRules: [
    ...(filters.filterRules || []).filter(
      (existingRule) => existingRule.field !== filterRule.field
    ),
    filterRule,
  ],
});

export const clearFilterRule = (
  filters: RequestListFilters,
  field: RequestListFilterRule['field']
): RequestListFilters => ({
  ...filters,
  page: 1,
  filterRules: (filters.filterRules || []).filter(
    (existingRule) => existingRule.field !== field
  ),
});

export const getStatusGroupsFromStatuses = (
  statuses?: BackendRequestStatus[] | null
) => {
  if (!statuses?.length) return [];

  return Object.entries(statusesByStatusGroup)
    .filter(([, groupStatuses]) =>
      groupStatuses.some((status) => statuses.includes(status))
    )
    .map(([statusGroup]) => statusGroup as RequestStatusGroup);
};

export const getStatusesFromStatusGroups = (
  statusGroups: RequestStatusGroup[]
) => statusGroups.flatMap((statusGroup) => statusesByStatusGroup[statusGroup]);
