export type DaysToOperationFilterOperator =
  | 'equals'
  | 'greaterThan'
  | 'lessThan'
  | 'between';

export interface DateComparisonBounds {
  gt?: Date;
  gte?: Date;
  lt?: Date;
  lte?: Date;
}

interface ZonedDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_TIMEZONE = 'UTC';

const toValidDate = (value: Date | string, label: string) => {
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw new RangeError(`${label} must be a valid date`);
  }

  return date;
};

const getZonedDateTimeParts = (
  date: Date,
  timezone = DEFAULT_TIMEZONE
): ZonedDateTimeParts => {
  const parts = new Intl.DateTimeFormat('en-US', {
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
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
    second: getPart('second'),
    millisecond: date.getUTCMilliseconds(),
  };
};

const compareZonedDateTimeParts = (
  left: ZonedDateTimeParts,
  right: ZonedDateTimeParts
) => {
  const leftValues = [
    left.year,
    left.month,
    left.day,
    left.hour,
    left.minute,
    left.second,
    left.millisecond,
  ];
  const rightValues = [
    right.year,
    right.month,
    right.day,
    right.hour,
    right.minute,
    right.second,
    right.millisecond,
  ];

  for (let index = 0; index < leftValues.length; index += 1) {
    if (leftValues[index] < rightValues[index]) return -1;
    if (leftValues[index] > rightValues[index]) return 1;
  }

  return 0;
};

const getCalendarDayIndex = ({ year, month, day }: ZonedDateTimeParts) =>
  Date.UTC(year, month - 1, day) / MS_PER_DAY;

const addCalendarDaysToParts = (
  parts: ZonedDateTimeParts,
  days: number
): ZonedDateTimeParts => {
  const nextDate = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day + days,
      parts.hour,
      parts.minute,
      parts.second,
      parts.millisecond
    )
  );

  return {
    year: nextDate.getUTCFullYear(),
    month: nextDate.getUTCMonth() + 1,
    day: nextDate.getUTCDate(),
    hour: nextDate.getUTCHours(),
    minute: nextDate.getUTCMinutes(),
    second: nextDate.getUTCSeconds(),
    millisecond: nextDate.getUTCMilliseconds(),
  };
};

const getTimeZoneOffset = (date: Date, timezone: string) => {
  const parts = getZonedDateTimeParts(date, timezone);
  const utcTimestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond
  );

  return utcTimestamp - date.getTime();
};

const zonedDateTimePartsToUtc = (
  parts: ZonedDateTimeParts,
  timezone: string
) => {
  const utcGuess = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      parts.millisecond
    )
  );
  const firstOffset = getTimeZoneOffset(utcGuess, timezone);
  let utcDate = new Date(utcGuess.getTime() - firstOffset);
  const secondOffset = getTimeZoneOffset(utcDate, timezone);

  if (firstOffset !== secondOffset) {
    utcDate = new Date(utcGuess.getTime() - secondOffset);
  }

  return utcDate;
};

const getReferenceBoundary = (
  referenceDate: Date,
  dayOffset: number,
  timezone: string
) =>
  zonedDateTimePartsToUtc(
    addCalendarDaysToParts(
      getZonedDateTimeParts(referenceDate, timezone),
      dayOffset
    ),
    timezone
  );

const assertSafeInteger = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be a safe integer`);
  }

  return value;
};

const getLowerBoundForAtLeast = (
  days: number,
  referenceDate: Date,
  timezone: string
): DateComparisonBounds => {
  if (days > 0) {
    return { gte: getReferenceBoundary(referenceDate, days, timezone) };
  }

  return {
    gt: getReferenceBoundary(
      referenceDate,
      days === 0 ? -1 : days - 1,
      timezone
    ),
  };
};

const getUpperBoundForAtMost = (
  days: number,
  referenceDate: Date,
  timezone: string
): DateComparisonBounds => {
  if (days >= 0) {
    return { lt: getReferenceBoundary(referenceDate, days + 1, timezone) };
  }

  return { lte: getReferenceBoundary(referenceDate, days, timezone) };
};

export const getDaysToOperation = (
  launchDate: Date | string,
  referenceDate: Date | string,
  timezone = DEFAULT_TIMEZONE
) => {
  const launch = toValidDate(launchDate, 'launchDate');
  const reference = toValidDate(referenceDate, 'referenceDate');
  const launchParts = getZonedDateTimeParts(launch, timezone);
  const referenceParts = getZonedDateTimeParts(reference, timezone);
  const sign = compareZonedDateTimeParts(launchParts, referenceParts);
  const calendarDayDifference = Math.abs(
    getCalendarDayIndex(launchParts) - getCalendarDayIndex(referenceParts)
  );

  if (sign === 0 || calendarDayDifference === 0) {
    return 0;
  }

  const adjustedLaunchParts = addCalendarDaysToParts(
    launchParts,
    -sign * calendarDayDifference
  );
  const isLastDayNotFull =
    compareZonedDateTimeParts(adjustedLaunchParts, referenceParts) === -sign;
  const days = sign * (calendarDayDifference - (isLastDayNotFull ? 1 : 0));

  return days === 0 ? 0 : days;
};

export const getDaysToOperationDateBounds = ({
  operator,
  value,
  from,
  to,
  referenceDate,
  timezone = DEFAULT_TIMEZONE,
}: {
  operator: DaysToOperationFilterOperator;
  value?: number;
  from?: number;
  to?: number;
  referenceDate: Date | string;
  timezone?: string;
}): DateComparisonBounds => {
  const reference = toValidDate(referenceDate, 'referenceDate');

  if (operator === 'between') {
    const fromDays = assertSafeInteger(from, 'from');
    const toDays = assertSafeInteger(to, 'to');

    if (fromDays > toDays) {
      throw new RangeError('from must be less than or equal to to');
    }

    return {
      ...getLowerBoundForAtLeast(fromDays, reference, timezone),
      ...getUpperBoundForAtMost(toDays, reference, timezone),
    };
  }

  const days = assertSafeInteger(value, 'value');

  if (operator === 'greaterThan') {
    return getLowerBoundForAtLeast(days + 1, reference, timezone);
  }

  if (operator === 'lessThan') {
    return getUpperBoundForAtMost(days - 1, reference, timezone);
  }

  return {
    ...getLowerBoundForAtLeast(days, reference, timezone),
    ...getUpperBoundForAtMost(days, reference, timezone),
  };
};
