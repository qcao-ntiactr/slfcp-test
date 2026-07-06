import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Box,
  Flex,
  Heading,
} from '@chakra-ui/react';
import { isEqual } from 'lodash';

import { PaginationBar } from '../PaginationBar';
import { useRequests } from '../../../hooks/UseRequests';
import {
  BackendRequestStatus,
  RequestListFilterRule,
  RequestListFilters,
  RequestListSortDirection,
  RequestListSortKey,
  RequestStatusGroup,
} from '../../../types.ts';
import { useHybridAuth } from '../../../context/HybridAuthContext';
import { StatusFilterBar } from '../../FilterControls/StatusFilterBar';

import { requestStatusFilterOptions } from './requestStatusFilterOptions';
import { statusesByStatusGroup } from './StatusesByStatusGroup';
import { useRequestTableColumns } from './requestColumns';
import { RequestColumnHeaderMenu } from './filtering/RequestColumnHeaderMenu';
import {
  clearFilterRule,
  getBrowserTimezone,
  getStatusesFromStatusGroups,
  getStatusGroupsFromStatuses,
  setFilterRule,
} from './filtering/requestFilterState';

/** Notification dots meant to portray unread approvals/denials to federal and ntia users */
// import { ApprovalDenialHeader } from './ApprovalDenialHeader';

const RequestsTable = () => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [filters, setFilters] = useState<RequestListFilters>({
    page: 1,
    pageSize: 10,
    unread: null,
    statuses: null,
    search: null,
    filterRules: [],
    sortBy: null,
    sortDirection: null,
    timezone: getBrowserTimezone(),
    referenceDate: currentDate.toISOString(),
  });

  const { user } = useHybridAuth();
  const { data, isLoading } = useRequests(filters, user?.id);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const updateCurrentDate = () => {
      const nextCurrentDate = new Date();
      setCurrentDate(nextCurrentDate);
      setFilters((prevFilters) => ({
        ...prevFilters,
        referenceDate: nextCurrentDate.toISOString(),
      }));
    };

    const updateAtMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      nextMidnight.setHours(0, 0, 0, 0);

      const msUntilMidnight = nextMidnight.getTime() - now.getTime();

      timeoutRef.current = setTimeout(() => {
        updateCurrentDate();

        intervalRef.current = setInterval(
          () => {
            updateCurrentDate();
          },
          24 * 60 * 60 * 1000
        ); // every 24 hours
      }, msUntilMidnight);
    };

    updateAtMidnight();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const updateFilters = (newFilters: Partial<RequestListFilters>) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      ...newFilters,
    }));
  };

  const filterByStatuses = (statuses: BackendRequestStatus[]) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      statuses: isEqual(prevFilters.statuses, statuses) ? undefined : statuses,
      page: 1, // Reset pagination when filtering
    }));
  };

  const dataTable = useMemo(() => data?.data || [], [data]);
  const columns = useRequestTableColumns({
    currentDate,
    timezone: filters.timezone || getBrowserTimezone(),
    userRole: user?.role,
  });
  const selectedStatusGroupValues = useMemo(
    () => getStatusGroupsFromStatuses(filters.statuses),
    [filters.statuses]
  );

  const applyFilterRule = (filterRule: RequestListFilterRule) => {
    setFilters((prevFilters) => setFilterRule(prevFilters, filterRule));
  };

  const clearColumnFilter = (field: RequestListFilterRule['field']) => {
    setFilters((prevFilters) => clearFilterRule(prevFilters, field));
  };

  const sortByColumn = (
    sortBy: RequestListSortKey,
    sortDirection: RequestListSortDirection
  ) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      sortBy,
      sortDirection,
      page: 1,
    }));
  };

  const clearSort = () => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      sortBy: null,
      sortDirection: null,
      page: 1,
    }));
  };

  const filterByStatusGroups = (statusGroups: RequestStatusGroup[]) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      statuses: statusGroups.length
        ? getStatusesFromStatusGroups(statusGroups)
        : null,
      page: 1,
    }));
  };

  const narrowColumns = [
    'viewDetails',
    'inquiries',
    'reviseRequest',
    'daysToOperation',
  ];

  return (
    <Box w="100%">
      <Box py={3}>
        <Heading size="xl">Request List</Heading>
        {/* Notification dots to portray unread approvals and denials to fed/ntia users */}
        {/* <ApprovalDenialHeader /> */}
      </Box>

      <Box p={5} backgroundColor="#0077CC1A" tabIndex={0} w="100%">
        <Flex
          mb={4}
          alignItems="center"
          justifyContent="space-between"
          px={2}
          gap={5}
        >
          <StatusFilterBar
            options={requestStatusFilterOptions}
            selectedValues={selectedStatusGroupValues}
            onSelect={(statusGroup) =>
              filterByStatuses(statusesByStatusGroup[statusGroup])
            }
            ariaLabelPrefix="Filter requests by status"
          />
        </Flex>

        <Box tabIndex={0} overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                {columns.map((column) => (
                  <Th
                    scope="col"
                    key={column.key}
                    wordBreak="normal"
                    whiteSpace="nowrap"
                    minW={
                      column.key === 'frequencies'
                        ? '50px'
                        : narrowColumns.includes(column.key)
                          ? '80px'
                          : '120px'
                    }
                    maxW={column.key === 'frequencies' ? '250px' : undefined}
                  >
                    <RequestColumnHeaderMenu
                      column={column}
                      filters={filters}
                      activeSortDirection={
                        filters.sortBy === column.sortKey
                          ? filters.sortDirection || undefined
                          : undefined
                      }
                      selectedStatusGroupValues={selectedStatusGroupValues}
                      onSort={sortByColumn}
                      onClearSort={clearSort}
                      onApplyFilter={applyFilterRule}
                      onClearFilter={clearColumnFilter}
                      onStatusGroupsChange={filterByStatusGroups}
                    />
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {isLoading ? (
                <Tr backgroundColor="white">
                  <Td colSpan={columns.length} textAlign="center">
                    <Spinner />
                  </Td>
                </Tr>
              ) : dataTable.length > 0 ? (
                dataTable.map((request) => (
                  <Tr key={request.id} backgroundColor="white">
                    {columns.map((column) => {
                      const renderedContent = column.render(request);
                      const isEmpty =
                        renderedContent === '' ||
                        renderedContent === null ||
                        renderedContent === undefined;

                      return (
                        <Td
                          key={column.key}
                          tabIndex={0}
                          aria-label={
                            isEmpty
                              ? `${column.header} empty or unavailable`
                              : undefined
                          }
                        >
                          {isEmpty ? '' : renderedContent}
                        </Td>
                      );
                    })}
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={columns.length} textAlign="center">
                    No Requests Found
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>

        <PaginationBar
          filters={filters}
          updateFilters={updateFilters}
          totalItems={data?.totalCount || 0}
        />
      </Box>
    </Box>
  );
};

export default RequestsTable;
