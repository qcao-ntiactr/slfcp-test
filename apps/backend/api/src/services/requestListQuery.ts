import type { Prisma } from '@prisma/client';
import { getDaysToOperationDateBounds } from '@slfcp/utils';

export class RequestListQueryError extends Error {
  statusCode = 400;
}

export type RequestListSortDirection = 'asc' | 'desc';

export type RequestListSortKey =
  | 'createdAt'
  | 'daysToOperation'
  | 'mission_name'
  | 'id'
  | 'launch_datetime_primary'
  | 'name_of_licensee'
  | 'primary_poc_email';

export type RequestSerialNumberSortRow = {
  id: number;
  root_request_id: number | null;
};

export const requestStatusValues = [
  'SUBMITTED',
  'UNDER_NTIA_INITIAL_REVIEW',
  'UNDER_INITIAL_REVISION_PER_NTIA',
  'UNDER_FEDERAL_AGENCIES_REVIEW',
  'UNDER_NTIA_FINAL_REVIEW',
  'UNDER_FINAL_REVISION_PER_NTIA',
  'DENIED',
  'APPROVED',
  'APPROVED_WITH_CONDITIONS',
] as const;

export type RequestStatus = (typeof requestStatusValues)[number];

export type RequestFilterRule =
  | {
      field: 'mission_name' | 'name_of_licensee' | 'primary_poc_email';
      type: 'text';
      operator:
        | 'contains'
        | 'doesNotContain'
        | 'equals'
        | 'startsWith'
        | 'endsWith';
      value?: string;
    }
  | {
      field: 'createdAt' | 'launch_datetime_primary';
      type: 'date';
      operator:
        | 'today'
        | 'yesterday'
        | 'last7Days'
        | 'last30Days'
        | 'olderThan30Days'
        | 'equals'
        | 'before'
        | 'after'
        | 'between';
      value?: string;
      from?: string;
      to?: string;
    }
  | {
      field: 'daysToOperation';
      type: 'number';
      operator: 'equals' | 'greaterThan' | 'lessThan' | 'between';
      value?: number;
      from?: number;
      to?: number;
    }
  | {
      field: 'id';
      type: 'serialNumber';
      operator: 'equals';
      value?: string;
    }
  | {
      field: 'status';
      type: 'status';
      operator: 'in' | 'notIn';
      values: RequestStatus[];
    };

const textFields = ['mission_name', 'name_of_licensee', 'primary_poc_email'];
const dateFields = ['createdAt', 'launch_datetime_primary'];
const numberFields = ['daysToOperation'];
const sortFields = [
  'createdAt',
  'daysToOperation',
  'mission_name',
  'id',
  'launch_datetime_primary',
  'name_of_licensee',
  'primary_poc_email',
];

const textOperators = [
  'contains',
  'doesNotContain',
  'equals',
  'startsWith',
  'endsWith',
];
const dateOperators = [
  'today',
  'yesterday',
  'last7Days',
  'last30Days',
  'olderThan30Days',
  'equals',
  'before',
  'after',
  'between',
];
const numberOperators = ['equals', 'greaterThan', 'lessThan', 'between'];
const serialNumberPattern = /^SLFCP-(\d{5,})-(\d{4})$/;

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const assertString = (value: unknown, message: string) => {
  if (typeof value !== 'string') throw new RequestListQueryError(message);
  return value;
};

const normalizeNumber = (value: unknown, message: string) => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new RequestListQueryError(message);
  }

  return value;
};

const normalizeTimezone = (timezone?: string) => {
  const nextTimezone = timezone || 'UTC';

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: nextTimezone }).format(
      new Date()
    );
    return nextTimezone;
  } catch (_error) {
    throw new RequestListQueryError('Invalid timezone');
  }
};

const normalizeReferenceDate = (referenceDate?: string | Date) => {
  if (!referenceDate) return new Date();

  const nextReferenceDate =
    referenceDate instanceof Date ? referenceDate : new Date(referenceDate);

  if (!Number.isFinite(nextReferenceDate.getTime())) {
    throw new RequestListQueryError('Invalid reference date');
  }

  return nextReferenceDate;
};

export const parseRequestSortKey = (
  sortBy: unknown
): RequestListSortKey | undefined => {
  if (!sortBy) return undefined;
  if (typeof sortBy !== 'string' || !sortFields.includes(sortBy)) {
    throw new RequestListQueryError('Invalid request sort field');
  }

  return sortBy as RequestListSortKey;
};

export const parseRequestSortDirection = (
  sortDirection: unknown
): RequestListSortDirection | undefined => {
  if (!sortDirection) return undefined;
  if (sortDirection !== 'asc' && sortDirection !== 'desc') {
    throw new RequestListQueryError('Invalid request sort direction');
  }

  return sortDirection;
};

export const parseRequestFilterRules = (
  rawFilterRules: unknown
): RequestFilterRule[] => {
  if (!rawFilterRules) return [];

  let parsedFilterRules: unknown;

  try {
    parsedFilterRules =
      typeof rawFilterRules === 'string'
        ? JSON.parse(rawFilterRules)
        : rawFilterRules;
  } catch (_error) {
    throw new RequestListQueryError('Invalid filter rules JSON');
  }

  if (!Array.isArray(parsedFilterRules)) {
    throw new RequestListQueryError('Filter rules must be an array');
  }

  return parsedFilterRules.map((filterRule) => {
    if (!isObject(filterRule)) {
      throw new RequestListQueryError('Invalid filter rule');
    }

    const field = assertString(filterRule.field, 'Filter rule field required');
    const type = assertString(filterRule.type, 'Filter rule type required');
    const operator = assertString(
      filterRule.operator,
      'Filter rule operator required'
    );

    if (type === 'text') {
      if (!textFields.includes(field) || !textOperators.includes(operator)) {
        throw new RequestListQueryError('Invalid text filter rule');
      }

      const value =
        typeof filterRule.value === 'string' ? filterRule.value.trim() : '';

      if (value.length === 0) {
        throw new RequestListQueryError('Text filter value required');
      }

      return {
        field: field as RequestFilterRule['field'],
        type,
        operator: operator as Extract<
          RequestFilterRule,
          { type: 'text' }
        >['operator'],
        value,
      } as RequestFilterRule;
    }

    if (type === 'date') {
      if (!dateFields.includes(field) || !dateOperators.includes(operator)) {
        throw new RequestListQueryError('Invalid date filter rule');
      }

      if (
        operator === 'equals' ||
        operator === 'before' ||
        operator === 'after'
      ) {
        parseDateOnly(
          typeof filterRule.value === 'string' ? filterRule.value : undefined
        );
      }

      if (operator === 'between') {
        const fromParts = parseDateOnly(
          typeof filterRule.from === 'string' ? filterRule.from : undefined
        );
        const toParts = parseDateOnly(
          typeof filterRule.to === 'string' ? filterRule.to : undefined
        );

        if (getDateOnlyIndex(fromParts) > getDateOnlyIndex(toParts)) {
          throw new RequestListQueryError('Date range requires from before to');
        }
      }

      return {
        field: field as RequestFilterRule['field'],
        type,
        operator: operator as Extract<
          RequestFilterRule,
          { type: 'date' }
        >['operator'],
        value:
          typeof filterRule.value === 'string' ? filterRule.value : undefined,
        from: typeof filterRule.from === 'string' ? filterRule.from : undefined,
        to: typeof filterRule.to === 'string' ? filterRule.to : undefined,
      } as RequestFilterRule;
    }

    if (type === 'number') {
      if (
        !numberFields.includes(field) ||
        !numberOperators.includes(operator)
      ) {
        throw new RequestListQueryError('Invalid number filter rule');
      }

      if (
        operator === 'between' &&
        (filterRule.from === undefined || filterRule.to === undefined)
      ) {
        throw new RequestListQueryError('Number range requires from and to');
      }

      if (operator !== 'between' && filterRule.value === undefined) {
        throw new RequestListQueryError('Number filter value required');
      }

      const value =
        filterRule.value === undefined
          ? undefined
          : normalizeNumber(filterRule.value, 'Invalid number filter value');
      const from =
        filterRule.from === undefined
          ? undefined
          : normalizeNumber(filterRule.from, 'Invalid number filter value');
      const to =
        filterRule.to === undefined
          ? undefined
          : normalizeNumber(filterRule.to, 'Invalid number filter value');

      if (
        operator === 'between' &&
        typeof from === 'number' &&
        typeof to === 'number' &&
        from > to
      ) {
        throw new RequestListQueryError('Number range requires from before to');
      }

      return {
        field: field as RequestFilterRule['field'],
        type,
        operator: operator as Extract<
          RequestFilterRule,
          { type: 'number' }
        >['operator'],
        value,
        from,
        to,
      } as RequestFilterRule;
    }

    if (type === 'serialNumber') {
      const value =
        typeof filterRule.value === 'string' ? filterRule.value.trim() : '';

      if (field !== 'id' || operator !== 'equals' || value.length === 0) {
        throw new RequestListQueryError('Invalid serial number filter rule');
      }

      return {
        field,
        type,
        operator,
        value,
      } as RequestFilterRule;
    }

    if (type === 'status') {
      const values = Array.isArray(filterRule.values)
        ? filterRule.values.filter(
            (value): value is RequestStatus =>
              typeof value === 'string' &&
              requestStatusValues.includes(value as RequestStatus)
          )
        : [];

      if (
        field !== 'status' ||
        (operator !== 'in' && operator !== 'notIn') ||
        values.length === 0
      ) {
        throw new RequestListQueryError('Invalid status filter rule');
      }

      return { field, type, operator, values } as RequestFilterRule;
    }

    throw new RequestListQueryError('Invalid filter rule type');
  });
};

const getTimeZoneOffset = (date: Date, timezone: string) => {
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const getPart = (type: string) =>
    Number(dateParts.find((part) => part.type === type)?.value);

  const utcTimestamp = Date.UTC(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    getPart('hour'),
    getPart('minute'),
    getPart('second')
  );

  return utcTimestamp - date.getTime();
};

const zonedTimeToUtc = (
  timezone: string,
  year: number,
  month: number,
  day: number
) => {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const firstOffset = getTimeZoneOffset(utcGuess, timezone);
  let utcDate = new Date(utcGuess.getTime() - firstOffset);
  const secondOffset = getTimeZoneOffset(utcDate, timezone);

  if (firstOffset !== secondOffset) {
    utcDate = new Date(utcGuess.getTime() - secondOffset);
  }

  return utcDate;
};

const getDatePartsInTimezone = (date: Date, timezone: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const getPart = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
  };
};

const parseDateOnly = (dateString?: string) => {
  if (!dateString) throw new RequestListQueryError('Date value required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new RequestListQueryError('Invalid date value');
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RequestListQueryError('Invalid date value');
  }

  return { year, month, day };
};

const getDateOnlyIndex = ({
  year,
  month,
  day,
}: {
  year: number;
  month: number;
  day: number;
}) => Date.UTC(year, month - 1, day);

const addCalendarDays = (
  dateParts: { year: number; month: number; day: number },
  days: number
) => {
  const nextDate = new Date(
    Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day + days)
  );

  return {
    year: nextDate.getUTCFullYear(),
    month: nextDate.getUTCMonth() + 1,
    day: nextDate.getUTCDate(),
  };
};

const getLocalDayRange = (
  timezone: string,
  dateParts: { year: number; month: number; day: number }
) => {
  const start = zonedTimeToUtc(
    timezone,
    dateParts.year,
    dateParts.month,
    dateParts.day
  );
  const nextDateParts = addCalendarDays(dateParts, 1);
  const end = zonedTimeToUtc(
    timezone,
    nextDateParts.year,
    nextDateParts.month,
    nextDateParts.day
  );

  return { start, end };
};

const getDateRangeForRule = (
  filterRule: Extract<RequestFilterRule, { type: 'date' }>,
  timezone: string
) => {
  const todayParts = getDatePartsInTimezone(new Date(), timezone);

  if (filterRule.operator === 'today') {
    return getLocalDayRange(timezone, todayParts);
  }

  if (filterRule.operator === 'yesterday') {
    return getLocalDayRange(timezone, addCalendarDays(todayParts, -1));
  }

  if (filterRule.operator === 'last7Days') {
    const fromParts = addCalendarDays(todayParts, -6);
    return {
      start: getLocalDayRange(timezone, fromParts).start,
      end: getLocalDayRange(timezone, todayParts).end,
    };
  }

  if (filterRule.operator === 'last30Days') {
    const fromParts = addCalendarDays(todayParts, -30);
    return {
      start: getLocalDayRange(timezone, fromParts).start,
      end: getLocalDayRange(timezone, todayParts).end,
    };
  }

  if (filterRule.operator === 'olderThan30Days') {
    const cutoffParts = addCalendarDays(todayParts, -30);
    return {
      end: getLocalDayRange(timezone, cutoffParts).start,
    };
  }

  if (filterRule.operator === 'equals') {
    return getLocalDayRange(timezone, parseDateOnly(filterRule.value));
  }

  if (filterRule.operator === 'before') {
    return {
      end: getLocalDayRange(timezone, parseDateOnly(filterRule.value)).start,
    };
  }

  if (filterRule.operator === 'after') {
    return {
      start: getLocalDayRange(timezone, parseDateOnly(filterRule.value)).end,
    };
  }

  const fromParts = parseDateOnly(filterRule.from);
  const toParts = parseDateOnly(filterRule.to);
  return {
    start: getLocalDayRange(timezone, fromParts).start,
    end: getLocalDayRange(timezone, toParts).end,
  };
};

const buildTextFilter = (
  filterRule: Extract<RequestFilterRule, { type: 'text' }>
): Prisma.RequestWhereInput => {
  const field = filterRule.field;
  const value = filterRule.value || '';

  if (filterRule.operator === 'doesNotContain') {
    return {
      NOT: { [field]: { contains: value, mode: 'insensitive' } },
    } as Prisma.RequestWhereInput;
  }

  const operator =
    filterRule.operator === 'startsWith'
      ? 'startsWith'
      : filterRule.operator === 'endsWith'
        ? 'endsWith'
        : filterRule.operator === 'equals'
          ? 'equals'
          : 'contains';

  return {
    [field]: { [operator]: value, mode: 'insensitive' },
  } as Prisma.RequestWhereInput;
};

const buildDateFilter = (
  filterRule: Extract<RequestFilterRule, { type: 'date' }>,
  timezone: string
): Prisma.RequestWhereInput => {
  const dateRange = getDateRangeForRule(filterRule, timezone);

  return {
    [filterRule.field]: {
      ...(dateRange.start ? { gte: dateRange.start } : {}),
      ...(dateRange.end ? { lt: dateRange.end } : {}),
    },
  } as Prisma.RequestWhereInput;
};

const buildNumberFilter = (
  filterRule: Extract<RequestFilterRule, { type: 'number' }>,
  timezone: string,
  referenceDate: Date
): Prisma.RequestWhereInput => ({
  launch_datetime_primary: getDaysToOperationDateBounds({
    operator: filterRule.operator,
    value: filterRule.value,
    from: filterRule.from,
    to: filterRule.to,
    referenceDate,
    timezone,
  }),
});

const buildNoMatchingRequestFilter = (): Prisma.RequestWhereInput => ({
  AND: [{ id: { equals: 0 } }, { id: { equals: -1 } }],
});

const getUtcYearBoundary = (year: number) => {
  const date = new Date(Date.UTC(year, 0, 1));
  date.setUTCFullYear(year);
  return date;
};

const buildSerialNumberFilter = (
  filterRule: Extract<RequestFilterRule, { type: 'serialNumber' }>
): Prisma.RequestWhereInput => {
  const serialNumberMatch = filterRule.value?.match(serialNumberPattern);

  if (!serialNumberMatch) return buildNoMatchingRequestFilter();

  const [, serialIdText, yearText] = serialNumberMatch;
  const serialId = Number(serialIdText);
  const year = Number(yearText);

  if (!Number.isSafeInteger(serialId)) return buildNoMatchingRequestFilter();

  return {
    AND: [
      {
        OR: [
          { root_request_id: serialId },
          { AND: [{ root_request_id: null }, { id: serialId }] },
        ],
      },
      {
        createdAt: {
          gte: getUtcYearBoundary(year),
          lt: getUtcYearBoundary(year + 1),
        },
      },
    ],
  };
};

const buildStatusFilter = (
  filterRule: Extract<RequestFilterRule, { type: 'status' }>
): Prisma.RequestWhereInput => ({
  status:
    filterRule.operator === 'in'
      ? { in: filterRule.values }
      : { notIn: filterRule.values },
});

export const buildRequestFilterConditions = (
  filterRules: RequestFilterRule[],
  timezone?: string,
  referenceDate?: string | Date
): Prisma.RequestWhereInput[] => {
  let normalizedTimezone: string | undefined;
  let normalizedReferenceDate: Date | undefined;

  return filterRules.map((filterRule) => {
    if (filterRule.type === 'text') return buildTextFilter(filterRule);
    if (filterRule.type === 'date') {
      normalizedTimezone ??= normalizeTimezone(timezone);
      return buildDateFilter(filterRule, normalizedTimezone);
    }
    if (filterRule.type === 'number') {
      normalizedTimezone ??= normalizeTimezone(timezone);
      normalizedReferenceDate ??= normalizeReferenceDate(referenceDate);
      return buildNumberFilter(
        filterRule,
        normalizedTimezone,
        normalizedReferenceDate
      );
    }
    if (filterRule.type === 'serialNumber') {
      return buildSerialNumberFilter(filterRule);
    }
    return buildStatusFilter(filterRule);
  });
};

export const getRequestSerialNumberSortValue = ({
  id,
  root_request_id,
}: RequestSerialNumberSortRow) => root_request_id ?? id;

export const compareRequestSerialNumberRows = (
  left: RequestSerialNumberSortRow,
  right: RequestSerialNumberSortRow,
  sortDirection: RequestListSortDirection = 'desc'
) => {
  const leftSerialNumber = getRequestSerialNumberSortValue(left);
  const rightSerialNumber = getRequestSerialNumberSortValue(right);
  const serialComparison =
    sortDirection === 'asc'
      ? leftSerialNumber - rightSerialNumber
      : rightSerialNumber - leftSerialNumber;

  if (serialComparison !== 0) return serialComparison;
  return right.id - left.id;
};

export const mergeRequestSerialNumberSortRows = (
  unrevisedRows: RequestSerialNumberSortRow[],
  revisedRows: RequestSerialNumberSortRow[],
  sortDirection: RequestListSortDirection = 'desc',
  limit = unrevisedRows.length + revisedRows.length
) => {
  const mergedRows: RequestSerialNumberSortRow[] = [];
  let unrevisedIndex = 0;
  let revisedIndex = 0;

  while (
    mergedRows.length < limit &&
    (unrevisedIndex < unrevisedRows.length || revisedIndex < revisedRows.length)
  ) {
    const unrevisedRow = unrevisedRows[unrevisedIndex];
    const revisedRow = revisedRows[revisedIndex];

    if (!unrevisedRow) {
      mergedRows.push(revisedRow);
      revisedIndex += 1;
      continue;
    }

    if (!revisedRow) {
      mergedRows.push(unrevisedRow);
      unrevisedIndex += 1;
      continue;
    }

    if (
      compareRequestSerialNumberRows(unrevisedRow, revisedRow, sortDirection) <=
      0
    ) {
      mergedRows.push(unrevisedRow);
      unrevisedIndex += 1;
    } else {
      mergedRows.push(revisedRow);
      revisedIndex += 1;
    }
  }

  return mergedRows;
};

export const buildRequestOrderBy = (
  sortBy?: RequestListSortKey,
  sortDirection: RequestListSortDirection = 'desc'
): Prisma.RequestOrderByWithRelationInput[] => {
  if (!sortBy) return [{ createdAt: 'desc' }, { id: 'desc' }];

  const direction = sortDirection || 'desc';

  if (sortBy === 'daysToOperation') {
    return [{ launch_datetime_primary: direction }, { id: 'desc' }];
  }

  if (sortBy === 'id') {
    throw new RequestListQueryError(
      'Serial number sorting requires coalesced request id pagination'
    );
  }

  return [
    { [sortBy]: direction } as Prisma.RequestOrderByWithRelationInput,
    { id: 'desc' },
  ];
};
