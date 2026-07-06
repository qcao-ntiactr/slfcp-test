import { useMemo, useState } from 'react';
import {
  Box,
  Spinner,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';

import { PaginationBar } from '../ViewRequests/PaginationBar';
import { ExpandableContentCell } from '../ExpandableContentCell';
import { usePublishedCommonConditions } from '../../hooks/UseCommonConditions';
import { CommonConditionFilters, CommonConditionListItem } from '../../types';
import { formatDateOrEmpty } from '../../utils/dateUtils';

export const CommonConditionsPublishedTable = () => {
  const [filters, setFilters] = useState<
    Pick<CommonConditionFilters, 'page' | 'pageSize'>
  >({
    page: 1,
    pageSize: 10,
  });

  const { data, isLoading } = usePublishedCommonConditions(filters);
  const dataTable = useMemo(() => data?.data || [], [data]);

  const updateFilters = (
    newFilters: Partial<Pick<CommonConditionFilters, 'page' | 'pageSize'>>
  ) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      ...newFilters,
    }));
  };

  const columns = [
    {
      header: 'PUBLISHED DATE',
      key: 'publishedAt',
      render: (condition: CommonConditionListItem) =>
        formatDateOrEmpty(condition.publishedAt, 'MM-dd-yyyy'),
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
  ];

  const narrowColumns: string[] = [];

  return (
    <Box w="100%">
      <Box p={5} backgroundColor="#0077CC1A" tabIndex={0} w="100%">
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
                    minW={narrowColumns.includes(column.key) ? '80px' : '120px'}
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
                    No Published Conditions Found
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
