import { describe, expect, it } from 'vitest';

import { formatDateOrEmpty, parseValidDate } from './dateUtils';

describe('dateUtils', () => {
  it('returns a cloned date for valid date inputs', () => {
    const date = new Date('2026-06-10T12:00:00.000Z');
    const parsedDate = parseValidDate(date);

    expect(parsedDate).toEqual(date);
    expect(parsedDate).not.toBe(date);
  });

  it('returns null for empty or invalid date inputs', () => {
    expect(parseValidDate(undefined)).toBeNull();
    expect(parseValidDate(null)).toBeNull();
    expect(parseValidDate('not-a-date')).toBeNull();
    expect(parseValidDate(new Date('not-a-date'))).toBeNull();
  });

  it('formats valid dates and returns an empty string for invalid dates', () => {
    expect(formatDateOrEmpty('2026-06-10T12:00:00.000Z', 'MM-dd-yyyy')).toBe(
      '06-10-2026'
    );
    expect(formatDateOrEmpty('not-a-date', 'MM-dd-yyyy')).toBe('');
  });
});
