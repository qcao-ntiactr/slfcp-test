import { describe, expect, it } from 'vitest';

import { RequestListFilters } from '../../../../types';

import {
  getActiveRequestFilterRules,
  serializeRequestListFilters,
} from './requestFilterSerialization';

describe('request filter serialization', () => {
  it('serializes active request table query state', () => {
    const filters: RequestListFilters = {
      page: 2,
      pageSize: 10,
      statuses: ['SUBMITTED'],
      sortBy: 'mission_name',
      sortDirection: 'asc',
      timezone: 'America/New_York',
      referenceDate: '2026-06-10T12:00:00.000Z',
      filterRules: [
        {
          field: 'id',
          type: 'serialNumber',
          operator: 'equals',
          value: 'SLFCP-00025-2026',
        },
      ],
    };

    expect(serializeRequestListFilters(filters)).toEqual({
      page: 2,
      pageSize: 10,
      statuses: ['SUBMITTED'],
      sortBy: 'mission_name',
      sortDirection: 'asc',
      timezone: 'America/New_York',
      referenceDate: '2026-06-10T12:00:00.000Z',
      filterRules: JSON.stringify(filters.filterRules),
    });
  });

  it('omits inactive filter rules', () => {
    expect(
      getActiveRequestFilterRules([
        {
          field: 'mission_name',
          type: 'text',
          operator: 'contains',
          value: '',
        },
        {
          field: 'createdAt',
          type: 'date',
          operator: 'today',
        },
        {
          field: 'createdAt',
          type: 'date',
          operator: 'equals',
          value: '2026-01-15',
        },
        {
          field: 'id',
          type: 'serialNumber',
          operator: 'equals',
          value: '',
        },
        {
          field: 'id',
          type: 'serialNumber',
          operator: 'equals',
          value: 'bar',
        },
        {
          field: 'daysToOperation',
          type: 'number',
          operator: 'between',
          from: 2,
          to: 1,
        },
        {
          field: 'launch_datetime_primary',
          type: 'date',
          operator: 'equals',
        },
        {
          field: 'launch_datetime_primary',
          type: 'date',
          operator: 'between',
          from: '2026-01-31',
          to: '2026-01-01',
        },
      ])
    ).toEqual([
      {
        field: 'createdAt',
        type: 'date',
        operator: 'today',
      },
      {
        field: 'createdAt',
        type: 'date',
        operator: 'equals',
        value: '2026-01-15',
      },
      {
        field: 'id',
        type: 'serialNumber',
        operator: 'equals',
        value: 'bar',
      },
    ]);
  });

  it('keeps zero-valued number filters active', () => {
    expect(
      getActiveRequestFilterRules([
        {
          field: 'daysToOperation',
          type: 'number',
          operator: 'equals',
          value: 0,
        },
        {
          field: 'daysToOperation',
          type: 'number',
          operator: 'between',
          from: 0,
          to: 0,
        },
      ])
    ).toEqual([
      {
        field: 'daysToOperation',
        type: 'number',
        operator: 'equals',
        value: 0,
      },
      {
        field: 'daysToOperation',
        type: 'number',
        operator: 'between',
        from: 0,
        to: 0,
      },
    ]);
  });
});
