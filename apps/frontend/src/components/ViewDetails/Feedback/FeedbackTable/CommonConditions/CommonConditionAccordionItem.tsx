import {
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Flex,
  Text,
} from '@chakra-ui/react';
import { FaPlus } from 'react-icons/fa';

import { ReadOnlyTipTapMarkdown } from './ReadOnlyTipTapMarkdown';
import { buildCommonConditionInsertionMarkdown } from './utils';
import type { CommonCondition } from './types';

const VIEW_DETAILS_BG = '#F5F7FA';

type CommonConditionAccordionItemProps = {
  condition: CommonCondition;
  onAddCondition?: (_markdown: string) => void;
};

export const CommonConditionAccordionItem = ({
  condition,
  onAddCondition,
}: CommonConditionAccordionItemProps) => {
  return (
    <AccordionItem
      border="1px solid"
      borderColor="gray.200"
      borderRadius="md"
      mb={2}
    >
      <Flex
        align="stretch"
        w="100%"
        px={4}
        transitionProperty="common"
        transitionDuration="normal"
        _hover={{ bg: 'blackAlpha.50' }}
      >
        <Flex align="center" flexShrink={0}>
          <Button
            aria-label={`Add ${condition.title}`}
            type="button"
            minW="24px"
            h="24px"
            w="24px"
            p={0}
            borderRadius="full"
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
            bg="green.500"
            color="white"
            _hover={{ bg: 'green.600' }}
            _active={{ bg: 'green.700' }}
            onClick={() => {
              onAddCondition?.(
                buildCommonConditionInsertionMarkdown(condition)
              );
            }}
          >
            <FaPlus size="12px" />
          </Button>
        </Flex>
        <Box as="h2" flex="1" m={0} minW={0}>
          <AccordionButton
            px={0}
            pl={3}
            pr={0}
            py={3}
            _hover={{ bg: 'transparent' }}
          >
            <Text as="span" flex="1" textAlign="left">
              {condition.title}
            </Text>
            <AccordionIcon />
          </AccordionButton>
        </Box>
      </Flex>
      <AccordionPanel pt={2}>
        <Box borderRadius="md" p={3} bg={VIEW_DETAILS_BG}>
          <ReadOnlyTipTapMarkdown markdown={condition.content} />
        </Box>
      </AccordionPanel>
    </AccordionItem>
  );
};
