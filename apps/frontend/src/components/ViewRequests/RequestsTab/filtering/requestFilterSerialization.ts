import { RequestListFilterRule, RequestListFilters } from '../../../../types';

const isTextRuleActive = (filterRule: RequestListFilterRule) => {
  if (filterRule.type !== 'text') return false;
  return Boolean(filterRule.value?.trim());
};

const isDateRuleActive = (filterRule: RequestListFilterRule) => {
  if (filterRule.type !== 'date') return false;

  if (
    filterRule.operator === 'equals' ||
    filterRule.operator === 'before' ||
    filterRule.operator === 'after'
  ) {
    return isValidDateOnly(filterRule.value);
  }

  if (filterRule.operator === 'between') {
    return (
      isValidDateOnly(filterRule.from) &&
      isValidDateOnly(filterRule.to) &&
      filterRule.from <= filterRule.to
    );
  }

  return true;
};

const isNumberRuleActive = (filterRule: RequestListFilterRule) => {
  if (filterRule.type !== 'number') return false;

  if (filterRule.operator === 'between') {
    return (
      isSafeInteger(filterRule.from) &&
      isSafeInteger(filterRule.to) &&
      filterRule.from <= filterRule.to
    );
  }

  return isSafeInteger(filterRule.value);
};

const isSerialNumberRuleActive = (filterRule: RequestListFilterRule) => {
  if (filterRule.type !== 'serialNumber') return false;
  return Boolean(filterRule.value?.trim());
};

const isSafeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value);

const isValidDateOnly = (value?: string): value is string => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

export const getActiveRequestFilterRules = (
  filterRules: RequestListFilterRule[] = []
) =>
  filterRules.filter(
    (filterRule) =>
      isTextRuleActive(filterRule) ||
      isDateRuleActive(filterRule) ||
      isNumberRuleActive(filterRule) ||
      isSerialNumberRuleActive(filterRule)
  );

export const serializeRequestListFilters = (filters: RequestListFilters) => {
  const activeFilterRules = getActiveRequestFilterRules(filters.filterRules);

  return {
    page: filters.page,
    pageSize: filters.pageSize,
    ...(filters.statuses?.length ? { statuses: filters.statuses } : {}),
    ...(filters.search ? { search: filters.search } : {}),
    ...(typeof filters.unread === 'boolean' ? { unread: filters.unread } : {}),
    ...(filters.sortBy ? { sortBy: filters.sortBy } : {}),
    ...(filters.sortDirection ? { sortDirection: filters.sortDirection } : {}),
    ...(filters.timezone ? { timezone: filters.timezone } : {}),
    ...(filters.referenceDate ? { referenceDate: filters.referenceDate } : {}),
    ...(activeFilterRules.length
      ? { filterRules: JSON.stringify(activeFilterRules) }
      : {}),
  };
};
