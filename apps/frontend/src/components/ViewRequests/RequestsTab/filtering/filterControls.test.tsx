// @vitest-environment jsdom

import { useState } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { RequestListFilterRule } from '../../../../types';

import {
  DateFilterControl,
  NumberFilterControl,
  SerialNumberFilterControl,
} from './filterControls';

afterEach(() => {
  cleanup();
});

const NumberFilterHarness = ({
  initialRule,
}: {
  initialRule: RequestListFilterRule;
}) => {
  const [filterRule, setFilterRule] = useState(initialRule);
  const [isValid, setIsValid] = useState(true);

  return (
    <ChakraProvider>
      <NumberFilterControl
        field="daysToOperation"
        filterRule={filterRule}
        onChange={setFilterRule}
        onValidityChange={setIsValid}
      />
      <output data-testid="filter-rule">{JSON.stringify(filterRule)}</output>
      <output data-testid="is-valid">{String(isValid)}</output>
    </ChakraProvider>
  );
};

const DateFilterHarness = ({
  initialRule,
}: {
  initialRule: RequestListFilterRule;
}) => {
  const [filterRule, setFilterRule] = useState(initialRule);

  return (
    <ChakraProvider>
      <DateFilterControl
        field="createdAt"
        filterRule={filterRule}
        onChange={setFilterRule}
      />
      <output data-testid="filter-rule">{JSON.stringify(filterRule)}</output>
    </ChakraProvider>
  );
};

const SerialNumberFilterHarness = ({
  initialRule,
}: {
  initialRule: RequestListFilterRule;
}) => {
  const [filterRule, setFilterRule] = useState(initialRule);

  return (
    <ChakraProvider>
      <SerialNumberFilterControl
        field="id"
        filterRule={filterRule}
        onChange={setFilterRule}
      />
      <output data-testid="filter-rule">{JSON.stringify(filterRule)}</output>
    </ChakraProvider>
  );
};

describe('date filter controls', () => {
  it('supports the Excel-style Equals condition with a single date value', async () => {
    const user = userEvent.setup();
    render(
      <DateFilterHarness
        initialRule={{
          field: 'createdAt',
          type: 'date',
          operator: 'today',
        }}
      />
    );

    await user.selectOptions(screen.getByRole('combobox'), 'equals');
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '2026-01-15' },
    });

    expect(
      JSON.parse(screen.getByTestId('filter-rule').textContent || '{}')
    ).toMatchObject({
      operator: 'equals',
      value: '2026-01-15',
    });
  });

  it('uses uppercase field labels for backwards date ranges', () => {
    render(
      <DateFilterHarness
        initialRule={{
          field: 'createdAt',
          type: 'date',
          operator: 'between',
          from: '2026-01-31',
          to: '2026-01-01',
        }}
      />
    );

    expect(
      screen.getByText('FROM date must be on or before TO date.')
    ).toBeTruthy();
  });
});

describe('number filter controls', () => {
  it('preserves a single-value textbox when switching single-value operators', async () => {
    const user = userEvent.setup();
    render(
      <NumberFilterHarness
        initialRule={{
          field: 'daysToOperation',
          type: 'number',
          operator: 'equals',
          value: 5,
        }}
      />
    );

    await user.selectOptions(screen.getByRole('combobox'), 'lessThan');

    expect(
      JSON.parse(screen.getByTestId('filter-rule').textContent || '{}')
    ).toMatchObject({
      operator: 'lessThan',
      value: 5,
    });
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('5');
  });

  it('does not copy a single value into range textboxes', async () => {
    const user = userEvent.setup();
    render(
      <NumberFilterHarness
        initialRule={{
          field: 'daysToOperation',
          type: 'number',
          operator: 'equals',
          value: 5,
        }}
      />
    );

    await user.selectOptions(screen.getByRole('combobox'), 'between');

    const rangeInputs = screen.getAllByRole('textbox');
    expect(rangeInputs).toHaveLength(2);
    expect((rangeInputs[0] as HTMLInputElement).value).toBe('');
    expect((rangeInputs[1] as HTMLInputElement).value).toBe('');
  });

  it('marks backwards ranges invalid while allowing equal endpoints', async () => {
    const user = userEvent.setup();
    render(
      <NumberFilterHarness
        initialRule={{
          field: 'daysToOperation',
          type: 'number',
          operator: 'between',
          from: 0,
          to: 0,
        }}
      />
    );

    expect(screen.getByTestId('is-valid').textContent).toBe('true');
    const [fromInput] = screen.getAllByRole('textbox');

    await user.clear(fromInput);
    await user.type(fromInput, '1');

    await waitFor(() => {
      expect(screen.getByTestId('is-valid').textContent).toBe('false');
    });
    expect(
      screen.getByText('FROM value must not exceed TO value.')
    ).toBeTruthy();
  });

  it('uses capitalized integer validation messages for single values', async () => {
    const user = userEvent.setup();
    render(
      <NumberFilterHarness
        initialRule={{
          field: 'daysToOperation',
          type: 'number',
          operator: 'equals',
          value: 5,
        }}
      />
    );

    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), '1.5');

    expect(screen.getByText('VALUE must be an integer.')).toBeTruthy();
  });

  it('uses a capitalized integer validation message for range starts', async () => {
    const user = userEvent.setup();
    render(
      <NumberFilterHarness
        initialRule={{
          field: 'daysToOperation',
          type: 'number',
          operator: 'between',
          from: 0,
          to: 0,
        }}
      />
    );

    const [fromInput, toInput] = screen.getAllByRole('textbox');
    await user.clear(fromInput);
    await user.type(fromInput, 'from');

    await waitFor(() => {
      expect(screen.getByText('FROM must be an integer.')).toBeTruthy();
    });
    expect(toInput).toBeTruthy();
  });

  it('uses a capitalized integer validation message for range ends', async () => {
    const user = userEvent.setup();
    render(
      <NumberFilterHarness
        initialRule={{
          field: 'daysToOperation',
          type: 'number',
          operator: 'between',
          from: 0,
          to: 0,
        }}
      />
    );

    const [, toInput] = screen.getAllByRole('textbox');
    await user.clear(toInput);
    await user.type(toInput, 'to');

    expect(screen.getByText('TO must be an integer.')).toBeTruthy();
  });
});

describe('serial number filter controls', () => {
  it('keeps the condition dropdown but only offers Equals', () => {
    render(
      <SerialNumberFilterHarness
        initialRule={{
          field: 'id',
          type: 'serialNumber',
          operator: 'equals',
          value: '',
        }}
      />
    );

    const conditionSelect = screen.getByRole('combobox');
    const options = conditionSelect.querySelectorAll('option');

    expect(options).toHaveLength(1);
    expect(options[0].value).toBe('equals');
    expect(options[0].textContent).toBe('Equals');
  });

  it('accepts arbitrary non-empty serial number text without validation', async () => {
    const user = userEvent.setup();
    render(
      <SerialNumberFilterHarness
        initialRule={{
          field: 'id',
          type: 'serialNumber',
          operator: 'equals',
          value: '',
        }}
      />
    );

    await user.type(screen.getByLabelText('Value'), 'bar');

    expect(
      JSON.parse(screen.getByTestId('filter-rule').textContent || '{}')
    ).toMatchObject({
      field: 'id',
      type: 'serialNumber',
      operator: 'equals',
      value: 'bar',
    });
    expect(screen.queryByText(/must be/i)).toBeNull();
  });
});
