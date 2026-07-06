import NodeCache from 'node-cache';
import {
  startOfISOWeek,
  endOfISOWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  subWeeks,
  subMonths,
  subQuarters,
  format,
} from 'date-fns';

export type Timeframe = 'week' | 'month' | 'quarter';

export const cache = new NodeCache();

export const TTL_SECONDS: Record<Timeframe, number> = {
  week: 7 * 24 * 60 * 60,
  month: 30 * 24 * 60 * 60,
  quarter: 90 * 24 * 60 * 60,
};

export const getCachePeriods = (now = new Date()) => ({
  lastWeek: {
    start: startOfISOWeek(subWeeks(now, 1)),
    end: endOfISOWeek(subWeeks(now, 1)),
  },
  lastMonth: {
    start: startOfMonth(subMonths(now, 1)),
    end: endOfMonth(subMonths(now, 1)),
  },
  lastQuarter: {
    start: startOfQuarter(subQuarters(now, 1)),
    end: endOfQuarter(subQuarters(now, 1)),
  },
});

/**
 * Builds a deterministic cache key like:
 *  - "dashboard:getRequestsSubmitted:week:1-5-2025"
 *  - "dashboard:getRequestsSubmitted:month:12-31-2024"
 *  - "dashboard:getRequestsSubmitted:quarter:12-31-2024"
 */
export function makeCacheKey(
  operation: string,
  timeframe?: Timeframe,
  now = new Date()
) {
  if (!timeframe) return operation;

  let periodEnd: Date;
  switch (timeframe) {
    case 'week':
      periodEnd = endOfISOWeek(subWeeks(now, 1));
      break;
    case 'month':
      periodEnd = endOfMonth(subMonths(now, 1));
      break;
    case 'quarter':
      periodEnd = endOfQuarter(subQuarters(now, 1));
      break;
  }

  const datePart = format(periodEnd!, 'M-d-yyyy');
  return `${operation}:${timeframe}:${datePart}`;
}
