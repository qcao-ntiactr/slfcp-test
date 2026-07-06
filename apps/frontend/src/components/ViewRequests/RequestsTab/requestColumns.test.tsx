// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UserRole } from '../../../context/HybridAuthContext';
import { RequestSummary } from '../../../types';

import { useRequestTableColumns } from './requestColumns';

const requestWithDates = (
  dates: Pick<RequestSummary, 'createdAt' | 'launch_datetime_primary'>
) =>
  ({
    ...dates,
  }) as RequestSummary;

describe('useRequestTableColumns', () => {
  it('renders empty date cells for invalid dates without throwing', () => {
    const { result } = renderHook(() =>
      useRequestTableColumns({
        currentDate: new Date('2026-06-10T12:00:00.000Z'),
        timezone: 'UTC',
        userRole: UserRole.ntia,
      })
    );
    const columns = result.current;
    const submittedDateColumn = columns.find(
      (column) => column.key === 'submitted_date'
    );
    const daysToOperationColumn = columns.find(
      (column) => column.key === 'daysToOperation'
    );
    const launchDateColumn = columns.find(
      (column) => column.key === 'launch_datetime_primary'
    );
    const request = requestWithDates({
      createdAt: 'not-a-date',
      launch_datetime_primary: 'also-not-a-date',
    });

    expect(submittedDateColumn?.render(request)).toBe('');
    expect(daysToOperationColumn?.render(request)).toBe('');
    expect(launchDateColumn?.render(request)).toBe('');
  });

  it('renders days to operation for valid launch dates', () => {
    const { result } = renderHook(() =>
      useRequestTableColumns({
        currentDate: new Date('2026-06-10T12:00:00.000Z'),
        timezone: 'UTC',
        userRole: UserRole.ntia,
      })
    );
    const daysToOperationColumn = result.current.find(
      (column) => column.key === 'daysToOperation'
    );

    expect(
      daysToOperationColumn?.render(
        requestWithDates({
          createdAt: '2026-06-01T12:00:00.000Z',
          launch_datetime_primary: '2026-06-11T12:00:00.000Z',
        })
      )
    ).toBe(1);
  });

  it('keeps status filterable without making it sortable', () => {
    const { result } = renderHook(() =>
      useRequestTableColumns({
        currentDate: new Date('2026-06-10T12:00:00.000Z'),
        timezone: 'UTC',
        userRole: UserRole.ntia,
      })
    );
    const statusColumn = result.current.find(
      (column) => column.key === 'status'
    );

    expect(statusColumn?.sortKey).toBeUndefined();
    expect(statusColumn?.filterConfig).toEqual({ type: 'status' });
  });

  it('renders launch serial numbers with the request created year', () => {
    const { result } = renderHook(() =>
      useRequestTableColumns({
        currentDate: new Date('2026-06-10T12:00:00.000Z'),
        timezone: 'UTC',
        userRole: UserRole.ntia,
      })
    );
    const launchSerialNumberColumn = result.current.find(
      (column) => column.key === 'id'
    );

    expect(
      launchSerialNumberColumn?.render({
        id: 250,
        root_request_id: 25,
        createdAt: '2024-12-31T23:59:59.000Z',
      } as RequestSummary)
    ).toBe('SLFCP-00025-2024');
  });
});
