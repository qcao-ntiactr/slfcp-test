import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildRequestFilterConditions,
  buildRequestOrderBy,
  compareRequestSerialNumberRows,
  getRequestSerialNumberSortValue,
  mergeRequestSerialNumberSortRows,
  parseRequestFilterRules,
  parseRequestSortDirection,
  parseRequestSortKey,
  RequestListQueryError,
  RequestSerialNumberSortRow,
} from './requestListQuery.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('parseRequestSortKey', () => {
  describe('positive tests', () => {
    it('should return undefined when sortBy is not provided', () => {
      expect(parseRequestSortKey(undefined)).toBeUndefined();
      expect(parseRequestSortKey(null)).toBeUndefined();
      expect(parseRequestSortKey('')).toBeUndefined();
    });

    it('should return a valid request sort key', () => {
      expect(parseRequestSortKey('createdAt')).toBe('createdAt');
      expect(parseRequestSortKey('mission_name')).toBe('mission_name');
      expect(parseRequestSortKey('id')).toBe('id');
    });
  });

  describe('negative tests', () => {
    it('should throw for unsupported sort fields', () => {
      expect(() => parseRequestSortKey('unsupported')).toThrow(
        RequestListQueryError
      );
      expect(() => parseRequestSortKey('status')).toThrow(
        RequestListQueryError
      );
    });

    it('should throw for non-string sort fields', () => {
      expect(() => parseRequestSortKey(123)).toThrow(RequestListQueryError);
    });
  });
});

describe('parseRequestSortDirection', () => {
  describe('positive tests', () => {
    it('should return undefined when sortDirection is not provided', () => {
      expect(parseRequestSortDirection(undefined)).toBeUndefined();
      expect(parseRequestSortDirection(null)).toBeUndefined();
      expect(parseRequestSortDirection('')).toBeUndefined();
    });

    it('should return a valid request sort direction', () => {
      expect(parseRequestSortDirection('asc')).toBe('asc');
      expect(parseRequestSortDirection('desc')).toBe('desc');
    });
  });

  describe('negative tests', () => {
    it('should throw for unsupported sort directions', () => {
      expect(() => parseRequestSortDirection('ascending')).toThrow(
        RequestListQueryError
      );
    });
  });
});

describe('parseRequestFilterRules', () => {
  describe('positive tests', () => {
    it('should return an empty array when filter rules are not provided', () => {
      expect(parseRequestFilterRules(undefined)).toEqual([]);
      expect(parseRequestFilterRules(null)).toEqual([]);
      expect(parseRequestFilterRules('')).toEqual([]);
    });

    it('should parse text filter rules and trim text values', () => {
      expect(
        parseRequestFilterRules([
          {
            field: 'mission_name',
            type: 'text',
            operator: 'contains',
            value: '  artemis  ',
          },
        ])
      ).toEqual([
        {
          field: 'mission_name',
          type: 'text',
          operator: 'contains',
          value: 'artemis',
        },
      ]);
    });

    it('should parse date filter rules from JSON', () => {
      expect(
        parseRequestFilterRules(
          JSON.stringify([
            {
              field: 'launch_datetime_primary',
              type: 'date',
              operator: 'between',
              from: '2026-01-01',
              to: '2026-01-31',
            },
            {
              field: 'createdAt',
              type: 'date',
              operator: 'equals',
              value: '2026-01-15',
            },
          ])
        )
      ).toEqual([
        {
          field: 'launch_datetime_primary',
          type: 'date',
          operator: 'between',
          value: undefined,
          from: '2026-01-01',
          to: '2026-01-31',
        },
        {
          field: 'createdAt',
          type: 'date',
          operator: 'equals',
          value: '2026-01-15',
          from: undefined,
          to: undefined,
        },
      ]);
    });

    it('should parse zero numeric filter values', () => {
      expect(
        parseRequestFilterRules([
          {
            field: 'daysToOperation',
            type: 'number',
            operator: 'between',
            from: 0,
            to: 0,
          },
          {
            field: 'daysToOperation',
            type: 'number',
            operator: 'equals',
            value: 0,
          },
        ])
      ).toEqual([
        {
          field: 'daysToOperation',
          type: 'number',
          operator: 'between',
          value: undefined,
          from: 0,
          to: 0,
        },
        {
          field: 'daysToOperation',
          type: 'number',
          operator: 'equals',
          value: 0,
          from: undefined,
          to: undefined,
        },
      ]);
    });

    it('should parse status filter rules and keep valid statuses', () => {
      expect(
        parseRequestFilterRules([
          {
            field: 'status',
            type: 'status',
            operator: 'in',
            values: ['SUBMITTED', 'NOT_A_STATUS', 'APPROVED'],
          },
        ])
      ).toEqual([
        {
          field: 'status',
          type: 'status',
          operator: 'in',
          values: ['SUBMITTED', 'APPROVED'],
        },
      ]);
    });

    it('should parse serial number filter rules and trim text values', () => {
      expect(
        parseRequestFilterRules([
          {
            field: 'id',
            type: 'serialNumber',
            operator: 'equals',
            value: '  SLFCP-00025-2026  ',
          },
        ])
      ).toEqual([
        {
          field: 'id',
          type: 'serialNumber',
          operator: 'equals',
          value: 'SLFCP-00025-2026',
        },
      ]);
    });
  });

  describe('negative tests', () => {
    it('should throw for malformed JSON', () => {
      expect(() => parseRequestFilterRules('[{')).toThrow(
        RequestListQueryError
      );
    });

    it('should throw when parsed filter rules are not an array', () => {
      expect(() => parseRequestFilterRules({})).toThrow(RequestListQueryError);
    });

    it('should throw when a filter rule is not an object', () => {
      expect(() => parseRequestFilterRules(['mission_name'])).toThrow(
        RequestListQueryError
      );
    });

    it('should throw for empty text values that require input', () => {
      expect(() =>
        parseRequestFilterRules([
          {
            field: 'mission_name',
            type: 'text',
            operator: 'contains',
            value: '   ',
          },
        ])
      ).toThrow(RequestListQueryError);
    });

    it('should throw for incomplete number ranges', () => {
      expect(() =>
        parseRequestFilterRules([
          {
            field: 'daysToOperation',
            type: 'number',
            operator: 'between',
            from: 10,
          },
        ])
      ).toThrow(RequestListQueryError);
    });

    it('should throw for numeric request id filters', () => {
      expect(() =>
        parseRequestFilterRules([
          {
            field: 'id',
            type: 'number',
            operator: 'equals',
            value: 25,
          },
        ])
      ).toThrow(RequestListQueryError);
    });

    it('should throw for serial number operators other than equals', () => {
      expect(() =>
        parseRequestFilterRules([
          {
            field: 'id',
            type: 'serialNumber',
            operator: 'contains',
            value: 'SLFCP-00025-2026',
          },
        ])
      ).toThrow(RequestListQueryError);
    });

    it.each([null, '10', 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
      'should throw for invalid numeric filter value %s',
      (value) => {
        expect(() =>
          parseRequestFilterRules([
            {
              field: 'daysToOperation',
              type: 'number',
              operator: 'equals',
              value,
            },
          ])
        ).toThrow(RequestListQueryError);
      }
    );

    it('should throw for backwards number ranges', () => {
      expect(() =>
        parseRequestFilterRules([
          {
            field: 'daysToOperation',
            type: 'number',
            operator: 'between',
            from: 2,
            to: 1,
          },
        ])
      ).toThrow(RequestListQueryError);
    });

    it('should throw for backwards date ranges', () => {
      expect(() =>
        parseRequestFilterRules([
          {
            field: 'launch_datetime_primary',
            type: 'date',
            operator: 'between',
            from: '2026-01-31',
            to: '2026-01-01',
          },
        ])
      ).toThrow(RequestListQueryError);
    });

    it('should throw for invalid date-only values', () => {
      expect(() =>
        parseRequestFilterRules([
          {
            field: 'launch_datetime_primary',
            type: 'date',
            operator: 'before',
            value: '2026-02-31',
          },
        ])
      ).toThrow(RequestListQueryError);
    });

    it('should throw for invalid status filters', () => {
      expect(() =>
        parseRequestFilterRules([
          {
            field: 'status',
            type: 'status',
            operator: 'in',
            values: ['NOT_A_STATUS'],
          },
        ])
      ).toThrow(RequestListQueryError);
    });
  });
});

describe('buildRequestFilterConditions', () => {
  describe('positive tests', () => {
    it('should build text filter conditions', () => {
      expect(
        buildRequestFilterConditions([
          {
            field: 'mission_name',
            type: 'text',
            operator: 'startsWith',
            value: 'Star',
          },
        ])
      ).toEqual([
        {
          mission_name: {
            startsWith: 'Star',
            mode: 'insensitive',
          },
        },
      ]);
    });

    it('should build exact serial number filter conditions', () => {
      expect(
        buildRequestFilterConditions([
          {
            field: 'id',
            type: 'serialNumber',
            operator: 'equals',
            value: 'SLFCP-00025-2026',
          },
        ])
      ).toEqual([
        {
          AND: [
            {
              OR: [
                { root_request_id: 25 },
                {
                  AND: [{ root_request_id: null }, { id: 25 }],
                },
              ],
            },
            {
              createdAt: {
                gte: new Date('2026-01-01T00:00:00.000Z'),
                lt: new Date('2027-01-01T00:00:00.000Z'),
              },
            },
          ],
        },
      ]);
    });

    it('should build no-match conditions for malformed serial number filters', () => {
      expect(
        buildRequestFilterConditions([
          {
            field: 'id',
            type: 'serialNumber',
            operator: 'equals',
            value: 'bar',
          },
        ])
      ).toEqual([
        {
          AND: [{ id: { equals: 0 } }, { id: { equals: -1 } }],
        },
      ]);
    });

    it('should build status filter conditions', () => {
      expect(
        buildRequestFilterConditions([
          {
            field: 'status',
            type: 'status',
            operator: 'notIn',
            values: ['DENIED'],
          },
        ])
      ).toEqual([
        {
          status: {
            notIn: ['DENIED'],
          },
        },
      ]);
    });

    it('should build date equals filter conditions for a single local day', () => {
      expect(
        buildRequestFilterConditions(
          [
            {
              field: 'createdAt',
              type: 'date',
              operator: 'equals',
              value: '2026-01-15',
            },
          ],
          'UTC'
        )
      ).toEqual([
        {
          createdAt: {
            gte: new Date('2026-01-15T00:00:00.000Z'),
            lt: new Date('2026-01-16T00:00:00.000Z'),
          },
        },
      ]);
    });

    it('should include the exact 30-day boundary in last 30 days', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-18T12:00:00.000Z'));

      expect(
        buildRequestFilterConditions(
          [
            {
              field: 'createdAt',
              type: 'date',
              operator: 'last30Days',
            },
          ],
          'UTC'
        )
      ).toEqual([
        {
          createdAt: {
            gte: new Date('2026-05-19T00:00:00.000Z'),
            lt: new Date('2026-06-19T00:00:00.000Z'),
          },
        },
      ]);

      expect(
        buildRequestFilterConditions(
          [
            {
              field: 'createdAt',
              type: 'date',
              operator: 'olderThan30Days',
            },
          ],
          'UTC'
        )
      ).toEqual([
        {
          createdAt: {
            lt: new Date('2026-05-19T00:00:00.000Z'),
          },
        },
      ]);
    });

    it('should build days-to-operation filters from the supplied reference date', () => {
      const referenceDate = '2026-06-10T12:00:00.000Z';

      expect(
        buildRequestFilterConditions(
          [
            {
              field: 'daysToOperation',
              type: 'number',
              operator: 'equals',
              value: 0,
            },
          ],
          'UTC',
          referenceDate
        )
      ).toEqual([
        {
          launch_datetime_primary: {
            gt: new Date('2026-06-09T12:00:00.000Z'),
            lt: new Date('2026-06-11T12:00:00.000Z'),
          },
        },
      ]);

      expect(
        buildRequestFilterConditions(
          [
            {
              field: 'daysToOperation',
              type: 'number',
              operator: 'lessThan',
              value: 0,
            },
          ],
          'UTC',
          referenceDate
        )
      ).toEqual([
        {
          launch_datetime_primary: {
            lte: new Date('2026-06-09T12:00:00.000Z'),
          },
        },
      ]);

      expect(
        buildRequestFilterConditions(
          [
            {
              field: 'daysToOperation',
              type: 'number',
              operator: 'greaterThan',
              value: 0,
            },
          ],
          'UTC',
          referenceDate
        )
      ).toEqual([
        {
          launch_datetime_primary: {
            gte: new Date('2026-06-11T12:00:00.000Z'),
          },
        },
      ]);
    });
  });

  describe('negative tests', () => {
    it('should throw for invalid timezones when date filters are present', () => {
      expect(() =>
        buildRequestFilterConditions(
          [{ field: 'createdAt', type: 'date', operator: 'today' }],
          'Invalid/Timezone'
        )
      ).toThrow(RequestListQueryError);
    });
  });

  describe('edge cases', () => {
    it('should not validate timezones when no date filters are present', () => {
      expect(() =>
        buildRequestFilterConditions(
          [
            {
              field: 'mission_name',
              type: 'text',
              operator: 'contains',
              value: 'apollo',
            },
          ],
          'Invalid/Timezone'
        )
      ).not.toThrow();
    });
  });
});

describe('getRequestSerialNumberSortValue', () => {
  describe('positive tests', () => {
    it('should return the request id when the row has no root request id', () => {
      expect(
        getRequestSerialNumberSortValue({ id: 25, root_request_id: null })
      ).toBe(25);
    });

    it('should return the root request id when the row has one', () => {
      expect(
        getRequestSerialNumberSortValue({ id: 250, root_request_id: 25 })
      ).toBe(25);
    });
  });
});

describe('compareRequestSerialNumberRows', () => {
  const firstRow: RequestSerialNumberSortRow = {
    id: 10,
    root_request_id: null,
  };
  const secondRow: RequestSerialNumberSortRow = {
    id: 200,
    root_request_id: 20,
  };

  describe('positive tests', () => {
    it('should order lower serial numbers first for ascending sort', () => {
      expect(
        compareRequestSerialNumberRows(firstRow, secondRow, 'asc')
      ).toBeLessThan(0);
    });

    it('should order higher serial numbers first for descending sort', () => {
      expect(
        compareRequestSerialNumberRows(firstRow, secondRow, 'desc')
      ).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should use request id as a tie breaker when serial numbers match', () => {
      expect(
        compareRequestSerialNumberRows(
          { id: 100, root_request_id: 10 },
          { id: 200, root_request_id: 10 },
          'asc'
        )
      ).toBeGreaterThan(0);
    });
  });
});

describe('mergeRequestSerialNumberSortRows', () => {
  describe('positive tests', () => {
    it('should merge ascending request rows by serial number', () => {
      const unrevisedRows: RequestSerialNumberSortRow[] = [
        { id: 10, root_request_id: null },
        { id: 100, root_request_id: null },
      ];
      const revisedRows: RequestSerialNumberSortRow[] = [
        { id: 200, root_request_id: 5 },
        { id: 300, root_request_id: 50 },
      ];

      expect(
        mergeRequestSerialNumberSortRows(unrevisedRows, revisedRows, 'asc').map(
          (request) => request.id
        )
      ).toEqual([200, 10, 300, 100]);
    });

    it('should merge descending request rows by serial number', () => {
      const unrevisedRows: RequestSerialNumberSortRow[] = [
        { id: 100, root_request_id: null },
        { id: 10, root_request_id: null },
      ];
      const revisedRows: RequestSerialNumberSortRow[] = [
        { id: 300, root_request_id: 50 },
        { id: 200, root_request_id: 5 },
      ];

      expect(
        mergeRequestSerialNumberSortRows(
          unrevisedRows,
          revisedRows,
          'desc'
        ).map((request) => request.id)
      ).toEqual([100, 300, 10, 200]);
    });
  });

  describe('edge cases', () => {
    it('should stop merging after the requested limit', () => {
      const unrevisedRows: RequestSerialNumberSortRow[] = [
        { id: 10, root_request_id: null },
        { id: 20, root_request_id: null },
      ];
      const revisedRows: RequestSerialNumberSortRow[] = [
        { id: 100, root_request_id: 5 },
        { id: 200, root_request_id: 15 },
      ];

      expect(
        mergeRequestSerialNumberSortRows(
          unrevisedRows,
          revisedRows,
          'asc',
          2
        ).map((request) => request.id)
      ).toEqual([100, 10]);
    });

    it('should return remaining rows when one input list is empty', () => {
      const unrevisedRows: RequestSerialNumberSortRow[] = [
        { id: 10, root_request_id: null },
      ];

      expect(
        mergeRequestSerialNumberSortRows(unrevisedRows, [], 'asc')
      ).toEqual(unrevisedRows);
    });
  });
});

describe('buildRequestOrderBy', () => {
  describe('positive tests', () => {
    it('should use created date and request id as the default sort', () => {
      expect(buildRequestOrderBy()).toEqual([
        { createdAt: 'desc' },
        { id: 'desc' },
      ]);
    });

    it('should build days to operation sort conditions', () => {
      expect(buildRequestOrderBy('daysToOperation', 'asc')).toEqual([
        { launch_datetime_primary: 'asc' },
        { id: 'desc' },
      ]);
    });

    it('should build field sort conditions with a request id tie breaker', () => {
      expect(buildRequestOrderBy('mission_name', 'asc')).toEqual([
        { mission_name: 'asc' },
        { id: 'desc' },
      ]);
    });
  });

  describe('negative tests', () => {
    it('should throw when serial number sorting is requested as a plain orderBy', () => {
      expect(() => buildRequestOrderBy('id', 'asc')).toThrow(
        RequestListQueryError
      );
    });
  });
});
