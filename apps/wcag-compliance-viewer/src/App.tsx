import {
  Box,
  Button,
  Code,
  Container,
  Heading,
  HStack,
  Input,
  Select,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useMemo, useState } from 'react';

import { assessment } from './assessmentData';
import type { WcagTable } from './types';
import { AssessmentTable } from './ui/AssessmentTable';
import { badgePalette, conformanceOptions } from './ui/constants';

export function App() {
  const [query, setQuery] = useState('');
  const [conformance, setConformance] = useState('All');

  const tables = assessment.tables as WcagTable[];
  const allRows = tables.flatMap((table) => table.rows);
  const generatedAgeDays = getReportAgeDays(assessment.generatedAt);
  const isStaleReport =
    !assessment.isPlaceholder &&
    generatedAgeDays !== null &&
    generatedAgeDays > 7;

  const summaryItems = useMemo(() => {
    return conformanceOptions
      .filter((option) => option !== 'All')
      .map((option) => ({
        label: option,
        count: allRows.filter((row) => row.conformanceLevel === option).length,
      }));
  }, [allRows]);

  return (
    <Box minH="100vh">
      <PageHeader />

      <Container maxW="1600px" py={8}>
        {assessment.isPlaceholder && <MissingAssessmentNotice />}
        {isStaleReport && <StaleReportNotice generatedAgeDays={generatedAgeDays} />}

        <FilterControls
          query={query}
          conformance={conformance}
          onQueryChange={setQuery}
          onConformanceChange={setConformance}
        />

        <SummaryFilters
          items={summaryItems}
          conformance={conformance}
          onConformanceChange={setConformance}
        />

        {tables.map((table) => (
          <AssessmentTable
            key={table.level}
            table={table}
            query={query}
            conformance={conformance}
          />
        ))}
      </Container>
    </Box>
  );
}

function PageHeader() {
  return (
    <Box as="header" bg="white" borderBottom="1px solid" borderColor="gray.200">
      <Container maxW="1600px" py={6}>
        <Heading as="h1" size="xl">
          WCAG Compliance Viewer
        </Heading>
        <Text mt={2} color="gray.600">
          AI-assisted assessment generated from the WCAG source template, monorepo
          source scan, and optional Playwright runtime evidence.
        </Text>
        <Text mt={1} fontSize="sm" color="gray.500">
          Generated: {formatGeneratedDate(assessment.generatedAt)} · Total criteria:{' '}
          {assessment.summary.total}
        </Text>
      </Container>
    </Box>
  );
}

function MissingAssessmentNotice() {
  return (
    <Box
      bg="orange.50"
      border="1px solid"
      borderColor="orange.200"
      color="orange.900"
      mb={6}
      p={4}
    >
      <Text fontWeight="700">No generated assessment is available.</Text>
      <Text mt={1}>
        Run <Code>pnpm wcag:generate</Code> to create the local report JSON, or use{' '}
        <Code>pnpm wcag:viewer</Code> to generate and launch the viewer.
      </Text>
    </Box>
  );
}

function StaleReportNotice({
  generatedAgeDays,
}: {
  generatedAgeDays: number | null;
}) {
  return (
    <Box
      bg="yellow.50"
      border="1px solid"
      borderColor="yellow.200"
      color="yellow.900"
      mb={6}
      p={4}
    >
      <Text fontWeight="700">This report may be stale.</Text>
      <Text mt={1}>
        It was generated {generatedAgeDays} days ago. Run{' '}
        <Code>pnpm wcag:generate</Code> before sharing or using it for remediation planning.
      </Text>
    </Box>
  );
}

function FilterControls({
  query,
  conformance,
  onQueryChange,
  onConformanceChange,
}: {
  query: string;
  conformance: string;
  onQueryChange: (value: string) => void;
  onConformanceChange: (value: string) => void;
}) {
  return (
    <Stack
      direction={{ base: 'column', lg: 'row' }}
      spacing={4}
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      p={5}
      mb={6}
    >
      <Input
        aria-label="Search assessment"
        placeholder="Search criteria, requirements, findings, repro steps, or files"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <Select
        aria-label="Filter by conformance"
        value={conformance}
        maxW={{ base: '100%', lg: '280px' }}
        onChange={(event) => onConformanceChange(event.target.value)}
      >
        {conformanceOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </Stack>
  );
}

function SummaryFilters({
  items,
  conformance,
  onConformanceChange,
}: {
  items: Array<{ label: string; count: number }>;
  conformance: string;
  onConformanceChange: (value: string) => void;
}) {
  return (
    <HStack wrap="wrap" spacing={2} mb={2}>
      {items.map((item) => (
        <SummaryFilterButton
          key={item.label}
          item={item}
          isActive={conformance === item.label}
          onClick={() =>
            onConformanceChange(conformance === item.label ? 'All' : item.label)
          }
        />
      ))}
      <Button size="sm" variant="ghost" onClick={() => onConformanceChange('All')}>
        Clear filter
      </Button>
    </HStack>
  );
}

function SummaryFilterButton({
  item,
  isActive,
  onClick,
}: {
  item: { label: string; count: number };
  isActive: boolean;
  onClick: () => void;
}) {
  const color = badgePalette[item.label] ?? 'gray';

  return (
    <HStack spacing={0}>
      <Button
        bg={isActive ? `${color}.500` : 'white'}
        border="1px solid"
        borderColor={`${color}.500`}
        borderRightRadius={0}
        color={isActive ? 'white' : `${color}.700`}
        h={8}
        px={3}
        size="sm"
        _hover={{ bg: isActive ? `${color}.600` : `${color}.50` }}
        onClick={onClick}
      >
        {item.label}
      </Button>
      <Box
        as="span"
        alignItems="center"
        bg={`${color}.50`}
        border="1px solid"
        borderColor={`${color}.500`}
        borderLeftWidth={0}
        borderRightRadius="md"
        color={`${color}.700`}
        display="inline-flex"
        fontSize="sm"
        fontWeight="700"
        h={8}
        minW="42px"
        px={3}
      >
        {item.count}
      </Box>
    </HStack>
  );
}

function formatGeneratedDate(value: string | null) {
  if (!value) return 'Not generated yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getReportAgeDays(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}
