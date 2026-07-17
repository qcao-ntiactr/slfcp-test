import { Badge, Box, Flex, Grid, Heading, Stack, Text } from '@chakra-ui/react';

import type { WcagRow, WcagTable } from '../types';
import { rowGridColumns } from './constants';
import { DetailCard } from './DetailCard';

export function AssessmentTable({
  table,
  query,
  conformance,
}: {
  table: WcagTable;
  query: string;
  conformance: string;
}) {
  const rows = table.rows.filter((row) => {
    const conformanceMatches =
      conformance === 'All' || row.conformanceLevel === conformance;
    return conformanceMatches && matchesQuery(row, query);
  });

  return (
    <Box as="section" mt={8}>
      <Flex align="baseline" justify="space-between" gap={4} mb={4}>
        <Heading as="h2" size="lg">
          {table.title}
        </Heading>
        <Badge colorScheme="blue" fontSize="sm">
          {rows.length} of {table.rows.length}
        </Badge>
      </Flex>

      <Grid
        templateColumns={rowGridColumns}
        gap={4}
        px={5}
        py={3}
        bg="gray.50"
        border="1px solid"
        borderColor="gray.200"
        display={{ base: 'none', lg: 'grid' }}
      >
        <ColumnHeader>Criteria</ColumnHeader>
        <ColumnHeader>Compliance Requirement</ColumnHeader>
        <ColumnHeader>Assessment</ColumnHeader>
        <ColumnHeader textAlign="right">Details</ColumnHeader>
      </Grid>

      <Stack spacing={3}>
        {rows.map((row) => (
          <DetailCard key={row.criteria} row={row} />
        ))}
        {rows.length === 0 && (
          <Box bg="white" border="1px solid" borderColor="gray.200" p={5}>
            <Text color="gray.600">No criteria match the current filters.</Text>
          </Box>
        )}
      </Stack>
    </Box>
  );
}

function ColumnHeader({
  children,
  textAlign,
}: {
  children: string;
  textAlign?: 'left' | 'right';
}) {
  return (
    <Text
      color="gray.600"
      fontSize="xs"
      fontWeight="700"
      textAlign={textAlign}
      textTransform="uppercase"
    >
      {children}
    </Text>
  );
}

function matchesQuery(row: WcagRow, query: string) {
  if (!query.trim()) return true;
  const haystack = [
    row.criteria,
    row.requirementSummary,
    row.conformanceLevel,
    row.remarks,
    row.howToVerify,
    row.howToReproduce,
    row.relevantFiles,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query.trim().toLowerCase());
}
