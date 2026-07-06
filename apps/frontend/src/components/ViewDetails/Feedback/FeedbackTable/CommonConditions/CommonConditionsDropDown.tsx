import { useEffect, useState } from 'react';
import { Accordion, Box, Button, Flex, Text } from '@chakra-ui/react';
import { Link } from 'react-router-dom';

import { getAllCommonConditions } from '../../../../../api/CommonConditions';
import {
  useHybridAuth,
  UserRole,
} from '../../../../../context/HybridAuthContext';

import { CommonConditionAccordionItem } from './CommonConditionAccordionItem';
import { CommonCondition } from './types';

const VIEW_DETAILS_BG = '#F5F7FA';

type CommonConditionsDropDownProps = {
  onAddCondition?: (_markdown: string) => void;
  isDisabled?: boolean;
};

export const CommonConditionsDropDown = ({
  onAddCondition,
  isDisabled = false,
}: CommonConditionsDropDownProps) => {
  const { user } = useHybridAuth();
  const [conditions, setConditions] = useState<CommonCondition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const headingId = 'common-conditions-heading';
  const descriptionId = 'common-conditions-description';
  const canManageLibrary =
    user?.role === UserRole.federal || user?.role === UserRole.ntia;

  useEffect(() => {
    let isMounted = true;

    const loadConditions = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const nextConditions = await getAllCommonConditions();
        if (isMounted) {
          setConditions(nextConditions);
        }
      } catch (_error) {
        if (isMounted) {
          setHasError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadConditions();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Box aria-labelledby={headingId} aria-describedby={descriptionId}>
      <Text id={headingId} fontWeight="bold" mb={1}>
        Common Conditions
      </Text>
      <Flex alignItems="center" justifyContent="space-between" gap={3} mb={3}>
        <Text id={descriptionId} fontSize="sm" color="gray.600">
          Select one or more common conditions to add to the condition details
          below.
        </Text>
        {canManageLibrary ? (
          <Button
            as={Link}
            to="/common-conditions"
            color="white"
            backgroundColor="#004a82"
            _hover={{ backgroundColor: '#003a5a' }}
            size="sm"
            flexShrink={0}
            aria-label="Manage common conditions library"
          >
            Manage Library
          </Button>
        ) : null}
      </Flex>
      {isLoading ? (
        <Text fontSize="sm" color="gray.600">
          Loading common conditions...
        </Text>
      ) : null}
      {hasError ? (
        <Text fontSize="sm" color="red.600">
          Unable to load common conditions.
        </Text>
      ) : null}
      <Box
        maxH="md"
        overflowY="auto"
        pr={1}
        opacity={isDisabled ? 0.6 : 1}
        pointerEvents={isDisabled ? 'none' : 'auto'}
        role="region"
        aria-labelledby={headingId}
        bg={VIEW_DETAILS_BG}
        borderRadius="md"
        sx={{
          scrollbarColor: `#A0AEC0 ${VIEW_DETAILS_BG}`,
          '&::-webkit-scrollbar': {
            width: '12px',
          },
          '&::-webkit-scrollbar-track': {
            background: VIEW_DETAILS_BG,
            borderRadius: '999px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#A0AEC0',
            borderRadius: '999px',
            border: `3px solid ${VIEW_DETAILS_BG}`,
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#718096',
          },
        }}
      >
        <Accordion allowMultiple>
          {conditions.map((condition) => (
            <CommonConditionAccordionItem
              key={condition.id}
              condition={condition}
              onAddCondition={(content) => onAddCondition?.(content)}
            />
          ))}
        </Accordion>
      </Box>
    </Box>
  );
};
