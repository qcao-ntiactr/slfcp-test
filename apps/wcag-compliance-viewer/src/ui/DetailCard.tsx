import {
  Badge,
  Box,
  Button,
  Collapse,
  Grid,
  Heading,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import type { ReactNode } from 'react';

import type { WcagRow } from '../types';
import { badgePalette, rowGridColumns } from './constants';
import { formatRelevantFiles } from './relevantFiles';
import { formatReproduction } from './ReproductionViolationList';
import { formatInlineText, formatText } from './textFormat';

export function DetailCard({ row }: { row: WcagRow }) {
  const { isOpen, onToggle } = useDisclosure();
  const shouldShowReproduction = [
    'Mostly Supports',
    'Partially Supports',
    'Does Not Support',
  ].includes(row.conformanceLevel);

  return (
    <Box bg="white" border="1px solid" borderColor="gray.200">
      <Grid templateColumns={rowGridColumns} gap={4} alignItems="start" p={5}>
        <Box minW={0}>
          <Text fontWeight="700" overflowWrap="anywhere">
            {row.criteria}
          </Text>
          <Badge mt={3} colorScheme={badgePalette[row.conformanceLevel] ?? 'gray'}>
            {row.conformanceLevel}
          </Badge>
        </Box>

        <LabeledCell label="Compliance Requirement">
          <Text overflowWrap="anywhere">{formatInlineText(row.requirementSummary)}</Text>
        </LabeledCell>

        <LabeledCell label="Assessment">
          <Text color="gray.700" overflowWrap="anywhere">
            {formatInlineText(row.remarks)}
          </Text>
        </LabeledCell>

        <Button size="sm" variant="outline" onClick={onToggle} justifySelf={{ base: 'start', lg: 'end' }}>
          {isOpen ? 'Hide details' : 'Details'}
        </Button>
      </Grid>

      <Collapse in={isOpen} animateOpacity>
        <Grid
          templateColumns={rowGridColumns}
          gap={4}
          borderTop="1px solid"
          borderColor="gray.100"
          p={5}
        >
          <DetailSection title="How To Verify">
            {formatText(row.howToVerify)}
          </DetailSection>

          <DetailSection title="Relevant Files">
            {formatRelevantFiles(row.relevantFiles)}
          </DetailSection>

          {shouldShowReproduction && (
            <DetailSection title="How To Reproduce Violation">
              {formatReproduction(row)}
            </DetailSection>
          )}

          <Box display={{ base: 'none', lg: 'block' }} />
        </Grid>
      </Collapse>
    </Box>
  );
}

function LabeledCell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Box minW={0}>
      <Text
        as="span"
        display={{ base: 'block', lg: 'none' }}
        color="gray.500"
        fontSize="xs"
        fontWeight="700"
        mb={1}
        textTransform="uppercase"
      >
        {label}
      </Text>
      {children}
    </Box>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Box minW={0}>
      <Heading as="h4" size="sm" mb={3}>
        {title}
      </Heading>
      <Box color="gray.700" overflowWrap="anywhere">
        {children}
      </Box>
    </Box>
  );
}
