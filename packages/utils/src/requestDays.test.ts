import { describe, expect, it, vi } from 'vitest';

import {
  DateComparisonBounds,
  getDaysToOperation,
  getDaysToOperationDateBounds,
} from './requestDays';

const referenceDate = new Date('2026-06-10T12:00:00.000Z');
const timezone = 'UTC';
const hour = 60 * 60 * 1000;

const addHours = (date: Date, hours: number) =>
  new Date(date.getTime() + hours * hour);

const matchesBounds = (date: Date, bounds: DateComparisonBounds) => {
  const time = date.getTime();

  return (
    (bounds.gt ? time > bounds.gt.getTime() : true) &&
    (bounds.gte ? time >= bounds.gte.getTime() : true) &&
    (bounds.lt ? time < bounds.lt.getTime() : true) &&
    (bounds.lte ? time <= bounds.lte.getTime() : true)
  );
};

describe('request day helpers', () => {
  it('defaults omitted timezone arguments to UTC', () => {
    const resolvedOptions = vi
      .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
      .mockReturnValue({
        timeZone: 'America/New_York',
      } as Intl.ResolvedDateTimeFormatOptions);

    try {
      const dstReferenceDate = new Date('2026-03-08T06:30:00.000Z');
      const launchDate = addHours(dstReferenceDate, 23);

      expect(getDaysToOperation(launchDate, dstReferenceDate)).toBe(
        getDaysToOperation(launchDate, dstReferenceDate, 'UTC')
      );
      expect(
        getDaysToOperation(launchDate, dstReferenceDate, 'America/New_York')
      ).toBe(1);
    } finally {
      resolvedOptions.mockRestore();
    }
  });

  it('matches the current days-to-operation display behavior around zero', () => {
    expect(
      getDaysToOperation(addHours(referenceDate, -24), referenceDate, timezone)
    ).toBe(-1);
    expect(
      getDaysToOperation(addHours(referenceDate, -23), referenceDate, timezone)
    ).toBe(0);
    expect(getDaysToOperation(referenceDate, referenceDate, timezone)).toBe(0);
    expect(
      getDaysToOperation(addHours(referenceDate, 23), referenceDate, timezone)
    ).toBe(0);
    expect(
      getDaysToOperation(addHours(referenceDate, 24), referenceDate, timezone)
    ).toBe(1);
  });

  it.each([
    [
      'equals zero',
      { operator: 'equals' as const, value: 0 },
      (days: number) => days === 0,
    ],
    [
      'less than zero',
      { operator: 'lessThan' as const, value: 0 },
      (days: number) => days < 0,
    ],
    [
      'greater than zero',
      { operator: 'greaterThan' as const, value: 0 },
      (days: number) => days > 0,
    ],
    [
      'between negative one and one',
      { operator: 'between' as const, from: -1, to: 1 },
      (days: number) => days >= -1 && days <= 1,
    ],
  ])(
    'returns bounds matching displayed day buckets for %s',
    (_label, filter, expectedMatch) => {
      const bounds = getDaysToOperationDateBounds({
        ...filter,
        referenceDate,
        timezone,
      });
      const candidates = [
        addHours(referenceDate, -49),
        addHours(referenceDate, -48),
        addHours(referenceDate, -47),
        addHours(referenceDate, -24),
        addHours(referenceDate, -23),
        referenceDate,
        addHours(referenceDate, 23),
        addHours(referenceDate, 24),
        addHours(referenceDate, 47),
        addHours(referenceDate, 48),
        addHours(referenceDate, 49),
      ];

      for (const candidate of candidates) {
        const days = getDaysToOperation(candidate, referenceDate, timezone);
        expect(matchesBounds(candidate, bounds)).toBe(expectedMatch(days));
      }
    }
  );

  it('allows equal range endpoints but rejects backwards ranges', () => {
    expect(() =>
      getDaysToOperationDateBounds({
        operator: 'between',
        from: 0,
        to: 0,
        referenceDate,
        timezone,
      })
    ).not.toThrow();

    expect(() =>
      getDaysToOperationDateBounds({
        operator: 'between',
        from: 1,
        to: 0,
        referenceDate,
        timezone,
      })
    ).toThrow(RangeError);
  });

  it('matches displayed day buckets across a non-UTC DST transition', () => {
    const dstTimezone = 'America/New_York';
    const dstReferenceDate = new Date('2026-03-08T06:30:00.000Z');
    const nearlyOneUtcDayLater = addHours(dstReferenceDate, 22);
    const oneLocalDayLater = addHours(dstReferenceDate, 23);
    const equalsOneBounds = getDaysToOperationDateBounds({
      operator: 'equals',
      value: 1,
      referenceDate: dstReferenceDate,
      timezone: dstTimezone,
    });

    expect(
      getDaysToOperation(nearlyOneUtcDayLater, dstReferenceDate, dstTimezone)
    ).toBe(0);
    expect(
      getDaysToOperation(oneLocalDayLater, dstReferenceDate, dstTimezone)
    ).toBe(1);
    expect(matchesBounds(nearlyOneUtcDayLater, equalsOneBounds)).toBe(false);
    expect(matchesBounds(oneLocalDayLater, equalsOneBounds)).toBe(true);
  });
});
