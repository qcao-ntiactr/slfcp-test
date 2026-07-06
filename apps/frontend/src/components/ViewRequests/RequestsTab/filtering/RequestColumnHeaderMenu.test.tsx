// @vitest-environment jsdom

import { ChakraProvider } from '@chakra-ui/react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RequestColumnHeaderMenu } from './RequestColumnHeaderMenu';
import { RequestTableColumn } from './types';

afterEach(() => {
  cleanup();
});

const numberFilterColumn: RequestTableColumn = {
  header: 'DAYS TO OPERATION',
  key: 'daysToOperation',
  sortKey: 'daysToOperation',
  filterConfig: { type: 'number', field: 'daysToOperation' },
  render: () => null,
};

const serialNumberFilterColumn: RequestTableColumn = {
  header: 'LAUNCH SERIAL NUMBER',
  key: 'id',
  sortKey: 'id',
  filterConfig: { type: 'serialNumber', field: 'id' },
  render: () => null,
};

const textFilterOnlyColumn: RequestTableColumn = {
  header: 'MISSION NAME',
  key: 'mission_name',
  filterConfig: { type: 'text', field: 'mission_name' },
  render: () => null,
};

describe('RequestColumnHeaderMenu', () => {
  it('applies a filter when Enter is pressed in the filter form', async () => {
    const user = userEvent.setup();
    const onApplyFilter = vi.fn();

    render(
      <ChakraProvider>
        <RequestColumnHeaderMenu
          column={numberFilterColumn}
          filters={{ page: 1, pageSize: 10 }}
          selectedStatusGroupValues={[]}
          onSort={vi.fn()}
          onClearSort={vi.fn()}
          onApplyFilter={onApplyFilter}
          onClearFilter={vi.fn()}
          onStatusGroupsChange={vi.fn()}
        />
      </ChakraProvider>
    );

    await user.click(
      screen.getByRole('button', {
        name: /open filters and sorting for days to operation/i,
      })
    );
    await user.type(await screen.findByLabelText('Value'), '0{Enter}');

    await waitFor(() => {
      expect(onApplyFilter).toHaveBeenCalledWith({
        field: 'daysToOperation',
        type: 'number',
        operator: 'equals',
        value: 0,
      });
    });
  });

  it('applies arbitrary serial number filter text when Enter is pressed', async () => {
    const user = userEvent.setup();
    const onApplyFilter = vi.fn();

    render(
      <ChakraProvider>
        <RequestColumnHeaderMenu
          column={serialNumberFilterColumn}
          filters={{ page: 1, pageSize: 10 }}
          selectedStatusGroupValues={[]}
          onSort={vi.fn()}
          onClearSort={vi.fn()}
          onApplyFilter={onApplyFilter}
          onClearFilter={vi.fn()}
          onStatusGroupsChange={vi.fn()}
        />
      </ChakraProvider>
    );

    await user.click(
      screen.getByRole('button', {
        name: /open filters and sorting for launch serial number/i,
      })
    );
    await user.type(await screen.findByLabelText('Value'), 'bar{Enter}');

    await waitFor(() => {
      expect(onApplyFilter).toHaveBeenCalledWith({
        field: 'id',
        type: 'serialNumber',
        operator: 'equals',
        value: 'bar',
      });
    });
  });

  it('labels filter-only columns without sorting text', () => {
    render(
      <ChakraProvider>
        <RequestColumnHeaderMenu
          column={textFilterOnlyColumn}
          filters={{ page: 1, pageSize: 10 }}
          selectedStatusGroupValues={[]}
          onSort={vi.fn()}
          onClearSort={vi.fn()}
          onApplyFilter={vi.fn()}
          onClearFilter={vi.fn()}
          onStatusGroupsChange={vi.fn()}
        />
      </ChakraProvider>
    );

    expect(
      screen.getByRole('button', {
        name: /open filters for mission name/i,
      })
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', {
        name: /open filters and sorting for mission name/i,
      })
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: /sort ascending for mission name/i })
    ).toBeNull();
    expect(
      screen.queryByRole('button', {
        name: /sort descending for mission name/i,
      })
    ).toBeNull();
  });
});
