import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Input,
  Select,
  Stack,
  Text,
} from '@chakra-ui/react';

import {
  RequestDateFilterField,
  RequestDateFilterOperator,
  RequestListFilterRule,
  RequestNumberFilterField,
  RequestNumberFilterOperator,
  RequestSerialNumberFilterField,
  RequestSerialNumberFilterOperator,
  RequestStatusGroup,
  RequestTextFilterField,
  RequestTextFilterOperator,
} from '../../../../types';
import { requestStatusFilterOptions } from '../requestStatusFilterOptions';

const textOperatorOptions: Array<{
  value: RequestTextFilterOperator;
  label: string;
}> = [
  { value: 'contains', label: 'Contains' },
  { value: 'doesNotContain', label: 'Does not contain' },
  { value: 'equals', label: 'Equals' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'endsWith', label: 'Ends with' },
];

const dateOperatorOptions: Array<{
  value: RequestDateFilterOperator;
  label: string;
}> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7Days', label: 'Last 7 days' },
  { value: 'last30Days', label: 'Last 30 days' },
  { value: 'olderThan30Days', label: 'Older than 30 days' },
  { value: 'equals', label: 'Equals' },
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'between', label: 'Between' },
];

const numberOperatorOptions: Array<{
  value: RequestNumberFilterOperator;
  label: string;
}> = [
  { value: 'equals', label: 'Equals' },
  { value: 'greaterThan', label: 'Greater than' },
  { value: 'lessThan', label: 'Less than' },
  { value: 'between', label: 'Between' },
];

const serialNumberOperatorOptions: Array<{
  value: RequestSerialNumberFilterOperator;
  label: string;
}> = [{ value: 'equals', label: 'Equals' }];

const integerPattern = /^-?\d+$/;
const fieldLabelProps = {
  color: 'gray.800',
  fontSize: 'xs',
  fontWeight: 'semibold',
  lineHeight: 'short',
  mb: 1,
};
const filterErrorMessageProps = {
  className: 'field-error',
  color: 'red.600',
  fontSize: 'xs',
  lineHeight: 'short',
  mt: 1,
  overflowWrap: 'anywhere' as const,
  textTransform: 'none' as const,
  whiteSpace: 'normal' as const,
};

const parseIntegerInput = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { isValid: true, value: undefined };
  }

  if (!integerPattern.test(trimmedValue)) {
    return { isValid: false, value: undefined };
  }

  const nextValue = Number(trimmedValue);

  if (!Number.isSafeInteger(nextValue)) {
    return { isValid: false, value: undefined };
  }

  return { isValid: true, value: nextValue };
};

const formatNumberInputValue = (value?: number) =>
  typeof value === 'number' ? String(value) : '';

interface TextFilterControlProps {
  field: RequestTextFilterField;
  filterRule?: RequestListFilterRule;
  onChange: (_filterRule: RequestListFilterRule) => void;
}

export const TextFilterControl = ({
  field,
  filterRule,
  onChange,
}: TextFilterControlProps) => {
  const currentRule =
    filterRule?.type === 'text' && filterRule.field === field
      ? filterRule
      : {
          field,
          type: 'text' as const,
          operator: 'contains' as const,
          value: '',
        };

  return (
    <Stack spacing={3}>
      <FormControl>
        <FormLabel htmlFor={`${field}-filter-condition`} {...fieldLabelProps}>
          Condition
        </FormLabel>
        <Select
          id={`${field}-filter-condition`}
          size="sm"
          value={currentRule.operator}
          onChange={(event) =>
            onChange({
              ...currentRule,
              operator: event.target.value as RequestTextFilterOperator,
            })
          }
        >
          {textOperatorOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormControl>
      <FormControl>
        <FormLabel htmlFor={`${field}-filter-value`} {...fieldLabelProps}>
          Value
        </FormLabel>
        <Input
          id={`${field}-filter-value`}
          size="sm"
          value={currentRule.value || ''}
          onChange={(event) =>
            onChange({
              ...currentRule,
              value: event.target.value,
            })
          }
        />
      </FormControl>
    </Stack>
  );
};

interface DateFilterControlProps {
  field: RequestDateFilterField;
  filterRule?: RequestListFilterRule;
  onChange: (_filterRule: RequestListFilterRule) => void;
  onValidityChange?: (_isValid: boolean) => void;
}

export const DateFilterControl = ({
  field,
  filterRule,
  onChange,
  onValidityChange,
}: DateFilterControlProps) => {
  const hasCurrentFieldRule =
    filterRule?.type === 'date' && filterRule.field === field;
  const currentRule = hasCurrentFieldRule
    ? filterRule
    : {
        field,
        type: 'date' as const,
        operator: 'today' as const,
      };
  const hasBackwardsRange =
    currentRule.operator === 'between' &&
    typeof currentRule.from === 'string' &&
    typeof currentRule.to === 'string' &&
    currentRule.from > currentRule.to;

  useEffect(() => {
    if (!hasCurrentFieldRule) {
      onChange(currentRule);
    }
  }, [currentRule, hasCurrentFieldRule, onChange]);

  useEffect(() => {
    onValidityChange?.(!hasBackwardsRange);
  }, [hasBackwardsRange, onValidityChange]);

  return (
    <Stack spacing={3}>
      <FormControl>
        <FormLabel htmlFor={`${field}-filter-condition`} {...fieldLabelProps}>
          Condition
        </FormLabel>
        <Select
          id={`${field}-filter-condition`}
          size="sm"
          value={currentRule.operator}
          onChange={(event) =>
            onChange({
              ...currentRule,
              operator: event.target.value as RequestDateFilterOperator,
            })
          }
        >
          {dateOperatorOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormControl>
      {currentRule.operator === 'equals' ||
      currentRule.operator === 'before' ||
      currentRule.operator === 'after' ? (
        <FormControl>
          <FormLabel htmlFor={`${field}-filter-date`} {...fieldLabelProps}>
            Date
          </FormLabel>
          <Input
            id={`${field}-filter-date`}
            size="sm"
            type="date"
            value={currentRule.value || ''}
            onChange={(event) =>
              onChange({
                ...currentRule,
                value: event.target.value,
              })
            }
          />
        </FormControl>
      ) : null}
      {currentRule.operator === 'between' ? (
        <>
          <HStack alignItems="flex-start" spacing={2}>
            <FormControl minW={0}>
              <FormLabel htmlFor={`${field}-filter-from`} {...fieldLabelProps}>
                From
              </FormLabel>
              <Input
                id={`${field}-filter-from`}
                size="sm"
                type="date"
                value={currentRule.from || ''}
                onChange={(event) =>
                  onChange({
                    ...currentRule,
                    from: event.target.value,
                  })
                }
              />
            </FormControl>
            <FormControl minW={0}>
              <FormLabel htmlFor={`${field}-filter-to`} {...fieldLabelProps}>
                To
              </FormLabel>
              <Input
                id={`${field}-filter-to`}
                size="sm"
                type="date"
                value={currentRule.to || ''}
                onChange={(event) =>
                  onChange({
                    ...currentRule,
                    to: event.target.value,
                  })
                }
              />
            </FormControl>
          </HStack>
          <FormControl isInvalid={hasBackwardsRange}>
            <FormErrorMessage {...filterErrorMessageProps}>
              FROM date must be on or before TO date.
            </FormErrorMessage>
          </FormControl>
        </>
      ) : null}
    </Stack>
  );
};

interface NumberFilterControlProps {
  field: RequestNumberFilterField;
  filterRule?: RequestListFilterRule;
  onChange: (_filterRule: RequestListFilterRule) => void;
  onValidityChange?: (_isValid: boolean) => void;
}

export const NumberFilterControl = ({
  field,
  filterRule,
  onChange,
  onValidityChange,
}: NumberFilterControlProps) => {
  const currentRule =
    filterRule?.type === 'number' && filterRule.field === field
      ? filterRule
      : {
          field,
          type: 'number' as const,
          operator: 'equals' as const,
          value: undefined,
        };

  const [valueText, setValueText] = useState(
    formatNumberInputValue(currentRule.value)
  );
  const [fromText, setFromText] = useState(
    formatNumberInputValue(currentRule.from)
  );
  const [toText, setToText] = useState(formatNumberInputValue(currentRule.to));
  const valueParseResult = useMemo(
    () => parseIntegerInput(valueText),
    [valueText]
  );
  const fromParseResult = useMemo(
    () => parseIntegerInput(fromText),
    [fromText]
  );
  const toParseResult = useMemo(() => parseIntegerInput(toText), [toText]);
  const hasBackwardsRange =
    currentRule.operator === 'between' &&
    fromParseResult.isValid &&
    toParseResult.isValid &&
    typeof fromParseResult.value === 'number' &&
    typeof toParseResult.value === 'number' &&
    fromParseResult.value > toParseResult.value;
  const hasInvalidNumber =
    currentRule.operator === 'between'
      ? !fromParseResult.isValid || !toParseResult.isValid
      : !valueParseResult.isValid;

  useEffect(() => {
    setValueText(formatNumberInputValue(currentRule.value));
    setFromText(formatNumberInputValue(currentRule.from));
    setToText(formatNumberInputValue(currentRule.to));
  }, [filterRule, currentRule.value, currentRule.from, currentRule.to]);

  useEffect(() => {
    onValidityChange?.(!hasInvalidNumber && !hasBackwardsRange);
  }, [hasBackwardsRange, hasInvalidNumber, onValidityChange]);

  const updateIntegerField = (
    fieldName: 'value' | 'from' | 'to',
    nextText: string
  ) => {
    const parseResult = parseIntegerInput(nextText);

    if (fieldName === 'value') setValueText(nextText);
    if (fieldName === 'from') setFromText(nextText);
    if (fieldName === 'to') setToText(nextText);

    if (!parseResult.isValid) return;

    onChange({
      ...currentRule,
      [fieldName]: parseResult.value,
    });
  };

  return (
    <Stack spacing={3}>
      <FormControl>
        <FormLabel htmlFor={`${field}-filter-condition`} {...fieldLabelProps}>
          Condition
        </FormLabel>
        <Select
          id={`${field}-filter-condition`}
          size="sm"
          value={currentRule.operator}
          onChange={(event) =>
            onChange({
              ...currentRule,
              operator: event.target.value as RequestNumberFilterOperator,
            })
          }
        >
          {numberOperatorOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormControl>
      {currentRule.operator === 'between' ? (
        <>
          <HStack alignItems="flex-start" spacing={2}>
            <FormControl isInvalid={!fromParseResult.isValid} minW={0}>
              <FormLabel htmlFor={`${field}-filter-from`} {...fieldLabelProps}>
                From
              </FormLabel>
              <Input
                id={`${field}-filter-from`}
                size="sm"
                inputMode="numeric"
                value={fromText}
                onChange={(event) =>
                  updateIntegerField('from', event.target.value)
                }
              />
              <FormErrorMessage {...filterErrorMessageProps}>
                FROM must be an integer.
              </FormErrorMessage>
            </FormControl>
            <FormControl isInvalid={!toParseResult.isValid} minW={0}>
              <FormLabel htmlFor={`${field}-filter-to`} {...fieldLabelProps}>
                To
              </FormLabel>
              <Input
                id={`${field}-filter-to`}
                size="sm"
                inputMode="numeric"
                value={toText}
                onChange={(event) =>
                  updateIntegerField('to', event.target.value)
                }
              />
              <FormErrorMessage {...filterErrorMessageProps}>
                TO must be an integer.
              </FormErrorMessage>
            </FormControl>
          </HStack>
          <FormControl isInvalid={hasBackwardsRange}>
            <FormErrorMessage {...filterErrorMessageProps}>
              FROM value must not exceed TO value.
            </FormErrorMessage>
          </FormControl>
        </>
      ) : (
        <FormControl isInvalid={!valueParseResult.isValid}>
          <FormLabel htmlFor={`${field}-filter-value`} {...fieldLabelProps}>
            Value
          </FormLabel>
          <Input
            id={`${field}-filter-value`}
            size="sm"
            inputMode="numeric"
            value={valueText}
            onChange={(event) =>
              updateIntegerField('value', event.target.value)
            }
          />
          <FormErrorMessage {...filterErrorMessageProps}>
            VALUE must be an integer.
          </FormErrorMessage>
        </FormControl>
      )}
    </Stack>
  );
};

interface SerialNumberFilterControlProps {
  field: RequestSerialNumberFilterField;
  filterRule?: RequestListFilterRule;
  onChange: (_filterRule: RequestListFilterRule) => void;
}

export const SerialNumberFilterControl = ({
  field,
  filterRule,
  onChange,
}: SerialNumberFilterControlProps) => {
  const currentRule =
    filterRule?.type === 'serialNumber' && filterRule.field === field
      ? filterRule
      : {
          field,
          type: 'serialNumber' as const,
          operator: 'equals' as const,
          value: '',
        };

  return (
    <Stack spacing={3}>
      <FormControl>
        <FormLabel htmlFor={`${field}-filter-condition`} {...fieldLabelProps}>
          Condition
        </FormLabel>
        <Select
          id={`${field}-filter-condition`}
          size="sm"
          value={currentRule.operator}
          onChange={(event) =>
            onChange({
              ...currentRule,
              operator: event.target.value as RequestSerialNumberFilterOperator,
            })
          }
        >
          {serialNumberOperatorOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormControl>
      <FormControl>
        <FormLabel htmlFor={`${field}-filter-value`} {...fieldLabelProps}>
          Value
        </FormLabel>
        <Input
          id={`${field}-filter-value`}
          size="sm"
          value={currentRule.value || ''}
          onChange={(event) =>
            onChange({
              ...currentRule,
              value: event.target.value,
            })
          }
        />
      </FormControl>
    </Stack>
  );
};

interface StatusFilterControlProps {
  selectedValues: RequestStatusGroup[];
  onChange: (_values: RequestStatusGroup[]) => void;
}

export const StatusFilterControl = ({
  selectedValues,
  onChange,
}: StatusFilterControlProps) => {
  const updateSelectedValues = (
    value: RequestStatusGroup,
    isChecked: boolean
  ) => {
    onChange(
      isChecked
        ? [...selectedValues, value]
        : selectedValues.filter((selectedValue) => selectedValue !== value)
    );
  };

  return (
    <Stack spacing={2}>
      {requestStatusFilterOptions.map((option) => (
        <Checkbox
          key={option.value}
          alignItems="flex-start"
          aria-label={`Status filter: ${option.label}`}
          isChecked={selectedValues.includes(option.value)}
          onChange={(event) =>
            updateSelectedValues(option.value, event.target.checked)
          }
        >
          <Text as="span" fontSize="xs" lineHeight="short" whiteSpace="normal">
            {option.label}
          </Text>
        </Checkbox>
      ))}
    </Stack>
  );
};

interface FilterActionButtonsProps {
  applyAriaLabel: string;
  applyButtonType?: 'button' | 'submit';
  canApply: boolean;
  clearAriaLabel: string;
  onApply?: () => void;
  onClear: () => void;
}

export const FilterActionButtons = ({
  applyAriaLabel,
  applyButtonType = 'button',
  canApply,
  clearAriaLabel,
  onApply,
  onClear,
}: FilterActionButtonsProps) => (
  <HStack justifyContent="flex-end" pt={2}>
    <Button
      aria-label={clearAriaLabel}
      size="sm"
      type="button"
      variant="ghost"
      onClick={onClear}
    >
      Clear
    </Button>
    <Button
      aria-label={applyAriaLabel}
      size="sm"
      type={applyButtonType}
      onClick={applyButtonType === 'submit' ? undefined : onApply}
      isDisabled={!canApply}
    >
      Apply
    </Button>
  </HStack>
);
