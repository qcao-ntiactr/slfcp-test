import { FormEvent, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  HStack,
  IconButton,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  VStack,
} from '@chakra-ui/react';
import { IoArrowDown, IoArrowUp, IoChevronDown } from 'react-icons/io5';

import { RequestListFilterRule, RequestStatusGroup } from '../../../../types';

import { getActiveRequestFilterRules } from './requestFilterSerialization';
import { getFilterRuleForField } from './requestFilterState';
import {
  DateFilterControl,
  FilterActionButtons,
  NumberFilterControl,
  SerialNumberFilterControl,
  StatusFilterControl,
  TextFilterControl,
} from './filterControls';
import { RequestColumnHeaderMenuProps } from './types';

const menuSectionHeadingProps = {
  as: 'h3' as const,
  color: 'gray.800',
  fontSize: 'sm',
  fontWeight: 'semibold',
  lineHeight: 'short',
  mb: 2,
  textTransform: 'uppercase' as const,
};

export const RequestColumnHeaderMenu = ({
  column,
  filters,
  activeSortDirection,
  selectedStatusGroupValues,
  onSort,
  onClearSort,
  onApplyFilter,
  onClearFilter,
  onStatusGroupsChange,
}: RequestColumnHeaderMenuProps) => {
  const [draftFilterRule, setDraftFilterRule] = useState<
    RequestListFilterRule | undefined
  >(undefined);
  const [draftStatusGroups, setDraftStatusGroups] = useState<
    RequestStatusGroup[]
  >([]);
  const [isFilterControlValid, setIsFilterControlValid] = useState(true);

  const columnFilterField =
    column.filterConfig && column.filterConfig.type !== 'status'
      ? column.filterConfig.field
      : undefined;
  const activeFilterRule = columnFilterField
    ? getFilterRuleForField(filters, columnFilterField)
    : undefined;
  const hasActiveFilter =
    column.filterConfig?.type === 'status'
      ? Boolean(filters.statuses?.length)
      : Boolean(activeFilterRule);
  const hasHeaderMenu = column.sortKey || column.filterConfig;

  useEffect(() => {
    setDraftFilterRule(activeFilterRule);
    setIsFilterControlValid(true);
  }, [activeFilterRule]);

  useEffect(() => {
    setDraftStatusGroups(selectedStatusGroupValues);
  }, [selectedStatusGroupValues]);

  if (!hasHeaderMenu) {
    return <>{column.header}</>;
  }

  const renderFilterControl = () => {
    if (!column.filterConfig) return null;

    if (column.filterConfig.type === 'status') {
      return (
        <StatusFilterControl
          selectedValues={draftStatusGroups}
          onChange={setDraftStatusGroups}
        />
      );
    }

    if (column.filterConfig.type === 'text') {
      return (
        <TextFilterControl
          field={column.filterConfig.field}
          filterRule={draftFilterRule}
          onChange={setDraftFilterRule}
        />
      );
    }

    if (column.filterConfig.type === 'date') {
      return (
        <DateFilterControl
          field={column.filterConfig.field}
          filterRule={draftFilterRule}
          onChange={setDraftFilterRule}
          onValidityChange={setIsFilterControlValid}
        />
      );
    }

    if (column.filterConfig.type === 'serialNumber') {
      return (
        <SerialNumberFilterControl
          field={column.filterConfig.field}
          filterRule={draftFilterRule}
          onChange={setDraftFilterRule}
        />
      );
    }

    return (
      <NumberFilterControl
        field={column.filterConfig.field}
        filterRule={draftFilterRule}
        onChange={setDraftFilterRule}
        onValidityChange={setIsFilterControlValid}
      />
    );
  };

  const canApplyFilter =
    column.filterConfig?.type === 'status'
      ? draftStatusGroups.length > 0
      : Boolean(
          isFilterControlValid &&
          draftFilterRule &&
          getActiveRequestFilterRules([draftFilterRule]).length > 0
        );

  const handleApplyFilter = (onClose: () => void) => {
    if (column.filterConfig?.type === 'status') {
      onStatusGroupsChange(draftStatusGroups);
      onClose();
      return;
    }

    if (draftFilterRule && canApplyFilter) {
      onApplyFilter(draftFilterRule);
      onClose();
    }
  };

  const handleClearFilter = (onClose: () => void) => {
    if (column.filterConfig?.type === 'status') {
      setDraftStatusGroups([]);
      onStatusGroupsChange([]);
      onClose();
      return;
    }

    if (columnFilterField) {
      setDraftFilterRule(undefined);
      onClearFilter(columnFilterField);
      onClose();
    }
  };

  const sortAscendingLabel = column.sortLabels?.asc || 'Sort ascending';
  const sortDescendingLabel = column.sortLabels?.desc || 'Sort descending';
  const headerMenuAriaLabel =
    column.sortKey && column.filterConfig
      ? `Open filters and sorting for ${column.header}`
      : column.sortKey
        ? `Open sorting for ${column.header}`
        : `Open filters for ${column.header}`;

  return (
    <Popover placement="bottom-start" closeOnBlur>
      {({ onClose }) => (
        <>
          <HStack spacing={1}>
            <Text as="span">{column.header}</Text>
            <PopoverTrigger>
              <IconButton
                aria-label={headerMenuAriaLabel}
                icon={<IoChevronDown />}
                size="xs"
                variant={
                  activeSortDirection || hasActiveFilter ? 'solid' : 'ghost'
                }
                colorScheme={
                  activeSortDirection || hasActiveFilter ? 'blue' : undefined
                }
              />
            </PopoverTrigger>
          </HStack>
          <PopoverContent maxW="calc(100vw - 24px)" w="320px">
            <PopoverArrow />
            <PopoverBody>
              <VStack align="stretch" spacing={3}>
                {column.sortKey ? (
                  <Box as="section" aria-label="Sort options">
                    <Text {...menuSectionHeadingProps}>Sort</Text>
                    <VStack align="stretch" spacing={1}>
                      <Button
                        aria-label={`${sortAscendingLabel} for ${column.header}`}
                        leftIcon={<IoArrowUp />}
                        justifyContent="flex-start"
                        h="auto"
                        minH={8}
                        size="sm"
                        textAlign="left"
                        variant={
                          activeSortDirection === 'asc' ? 'solid' : 'ghost'
                        }
                        whiteSpace="normal"
                        onClick={() => {
                          if (column.sortKey) onSort(column.sortKey, 'asc');
                          onClose();
                        }}
                      >
                        {sortAscendingLabel}
                      </Button>
                      <Button
                        aria-label={`${sortDescendingLabel} for ${column.header}`}
                        leftIcon={<IoArrowDown />}
                        justifyContent="flex-start"
                        h="auto"
                        minH={8}
                        size="sm"
                        textAlign="left"
                        variant={
                          activeSortDirection === 'desc' ? 'solid' : 'ghost'
                        }
                        whiteSpace="normal"
                        onClick={() => {
                          if (column.sortKey) onSort(column.sortKey, 'desc');
                          onClose();
                        }}
                      >
                        {sortDescendingLabel}
                      </Button>
                      {activeSortDirection ? (
                        <Button
                          aria-label={`Clear sort for ${column.header}`}
                          justifyContent="flex-start"
                          h="auto"
                          minH={8}
                          size="sm"
                          textAlign="left"
                          variant="ghost"
                          whiteSpace="normal"
                          onClick={() => {
                            onClearSort();
                            onClose();
                          }}
                        >
                          Clear sort
                        </Button>
                      ) : null}
                    </VStack>
                  </Box>
                ) : null}

                {column.sortKey && column.filterConfig ? <Divider /> : null}

                {column.filterConfig ? (
                  <Box
                    as="form"
                    aria-label="Filter options"
                    onSubmit={(event: FormEvent<HTMLFormElement>) => {
                      event.preventDefault();
                      handleApplyFilter(onClose);
                    }}
                  >
                    <Text {...menuSectionHeadingProps}>Filter</Text>
                    {renderFilterControl()}
                    <FilterActionButtons
                      applyAriaLabel={`Apply filter for ${column.header}`}
                      applyButtonType="submit"
                      canApply={canApplyFilter}
                      clearAriaLabel={`Clear filter for ${column.header}`}
                      onClear={() => handleClearFilter(onClose)}
                    />
                  </Box>
                ) : null}
              </VStack>
            </PopoverBody>
          </PopoverContent>
        </>
      )}
    </Popover>
  );
};
