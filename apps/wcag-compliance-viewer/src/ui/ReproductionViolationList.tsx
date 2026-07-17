import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Text,
} from '@chakra-ui/react';

import type { ReproductionViolation, WcagRow } from '../types';
import { formatInlineText, formatText } from './textFormat';

export function formatReproduction(row: WcagRow) {
  if (row.reproductionViolations && row.reproductionViolations.length > 0) {
    return <ReproductionViolationList violations={row.reproductionViolations} />;
  }

  return formatText(row.howToReproduce);
}

function ReproductionViolationList({
  violations,
}: {
  violations: ReproductionViolation[];
}) {
  return (
    <Accordion allowMultiple>
      {violations.map((violation, index) => (
        <AccordionItem
          key={`${violation.title}-${index}`}
          border="1px solid"
          borderColor="gray.200"
          mb={2}
        >
          <AccordionButton px={3} py={2}>
            <Box flex="1" minW={0} textAlign="left">
              <Text color="gray.500" fontSize="xs" fontWeight="700" textTransform="uppercase">
                Violation {index + 1}
              </Text>
              <Text color="gray.900" fontWeight="700" overflowWrap="anywhere">
                {formatInlineText(violation.title)}
              </Text>
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel px={3} pb={3} pt={1}>
            <Box as="ol" color="gray.700" pl={5}>
              {violation.steps.map((step, stepIndex) => (
                <Text
                  key={`${step}-${stepIndex}`}
                  as="li"
                  mb={stepIndex === violation.steps.length - 1 ? 0 : 2}
                  overflowWrap="anywhere"
                >
                  {formatInlineText(step)}
                </Text>
              ))}
            </Box>
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
