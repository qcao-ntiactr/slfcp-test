import { useMemo, useState } from 'react';
import {
  Box,
  Flex,
  Spinner,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { isEqual } from 'lodash';

import { PaginationBar } from '../ViewRequests/PaginationBar';
import { ExpandableContentCell } from '../ExpandableContentCell';
import { StatusFilterBar } from '../FilterControls/StatusFilterBar';
import { useCommonConditionSubmissions } from '../../hooks/UseCommonConditions';
import { useHybridAuth, UserRole } from '../../context/HybridAuthContext';
import {
  BackendCommonConditionStatus,
  CommonConditionFilters,
  CommonConditionListItem,
} from '../../types';
import { formatDateOrEmpty } from '../../utils/dateUtils';

import {
  CommonConditionActionsMenu,
  getCommonConditionSubmissionFilters,
} from './CommonConditionsTableHelpers';
import { CommonConditionStatusLabel } from './CommonConditionStatusLabel';

export const CommonConditionsSubmissionsTable = () => {
  const { user } = useHybridAuth();
  const [filters, setFilters] = useState<CommonConditionFilters>({
    page: 1,
    pageSize: 10,
    statuses: null,
  });
  const filterOptions = getCommonConditionSubmissionFilters(
    user?.role === UserRole.ntia
  );

  const { data, isLoading } = useCommonConditionSubmissions(filters);
  const dataTable = useMemo(() => data?.data || [], [data]);

  const updateFilters = (newFilters: Partial<CommonConditionFilters>) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      ...newFilters,
    }));
  };

  const filterByStatuses = (statuses: BackendCommonConditionStatus[]) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      statuses: isEqual(prevFilters.statuses, statuses) ? null : statuses,
      page: 1,
    }));
  };

  const columns = [
    {
      header: 'STATUS',
      key: 'status',
      render: (condition: CommonConditionListItem) => (
        <CommonConditionStatusLabel status={condition.status} />
      ),
    },
    {
      header: 'CREATED',
      key: 'createdAt',
      render: (condition: CommonConditionListItem) =>
        formatDateOrEmpty(condition.createdAt, 'MM-dd-yyyy'),
    },
    {
      header: 'CONDITION NAME',
      key: 'title',
      render: (condition: CommonConditionListItem) => condition.title,
    },
    {
      header: 'DETAILS',
      key: 'content',
      render: (condition: CommonConditionListItem) => (
        <Box minW="280px" maxW="560px">
          <ExpandableContentCell
            content={condition.content}
            ariaLabel={`Expand details for common condition ${condition.title}`}
          />
        </Box>
      ),
    },
    {
      header: 'SUBMITTED BY',
      key: 'submittedBy',
      render: (condition: CommonConditionListItem) =>
        condition.submittedBy || '',
    },
    {
      header: 'ACTIONS',
      key: 'actions',
      render: (condition: CommonConditionListItem) => (
        <CommonConditionActionsMenu condition={condition} />
      ),
    },
  ];

  const narrowColumns = ['actions'];

  return (
    <Box w="100%">
      <Box p={5} backgroundColor="#0077CC1A" tabIndex={0} w="100%">
        <Flex
          mb={4}
          alignItems="center"
          justifyContent="space-between"
          px={2}
          gap={5}
        >
          <StatusFilterBar
            options={filterOptions}
            selectedValue={filters.statuses?.[0]}
            onSelect={(status) => filterByStatuses([status])}
            ariaLabelPrefix="Filter common condition submissions by status"
          />
        </Flex>

        <Box tabIndex={0} overflowX="auto" pr={3}>
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
                      narrowColumns.includes(column.key) ? '120px' : '120px'
                    }
                  >
                    {column.header}
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
                dataTable.map((condition) => (
                  <Tr key={condition.id} backgroundColor="white">
                    {columns.map((column) => {
                      const renderedContent = column.render(condition);
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
                    No Common Condition Submissions Found
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
