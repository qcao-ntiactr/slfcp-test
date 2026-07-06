import {
  Button,
  Divider,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react';
import { format } from 'date-fns';

import { CommonConditionListItem } from '../../types';
import { getCommonConditionStatusLabel } from '../utils/Helpers';
import { ReadOnlyTipTapMarkdown } from '../ViewDetails/Feedback/FeedbackTable/CommonConditions/ReadOnlyTipTapMarkdown';

interface CommonConditionViewModalProps {
  condition: CommonConditionListItem;
  isOpen: boolean;
  onClose: () => void;
}

export const CommonConditionViewModal = ({
  condition,
  isOpen,
  onClose,
}: CommonConditionViewModalProps) => {
  const metadataDate = condition.publishedAt ?? condition.createdAt;
  const detailItems = [
    {
      label: 'Status',
      value: getCommonConditionStatusLabel(condition.status),
    },
    {
      label: 'Submitted By',
      value: condition.submittedBy || 'Unavailable',
    },
    {
      label: condition.publishedAt ? 'Published' : 'Created',
      value: metadataDate
        ? format(new Date(metadataDate), 'MMM d, yyyy | h:mm a')
        : 'Unavailable',
    },
    ...(condition.rejectionReason
      ? [
          {
            label: 'Denial Reason',
            value: condition.rejectionReason,
          },
        ]
      : []),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
      <ModalOverlay backdropFilter="blur(5px)" />
      <ModalContent
        maxW="800px"
        bg="#F2F2F2"
        borderRadius="6px"
        boxShadow="0px 1px 5px 0px rgba(0,0,0,0.1), 0px 3.6px 13px 0px rgba(0,0,0,0.07), 0px 8.4px 23px 0px rgba(0,0,0,0.06), 0px 23px 35px 0px rgba(0,0,0,0.05)"
        p={4}
      >
        <ModalHeader
          p={0}
          mb={4}
          fontWeight="bold"
          fontSize="24px"
          lineHeight="32px"
        >
          {condition.title}
        </ModalHeader>
        <ModalCloseButton top={2} right={2} />
        <ModalBody p={0}>
          <VStack align="stretch" spacing={0} mb={5}>
            {detailItems.map((item, index) => (
              <Flex
                key={item.label}
                justifyContent="space-between"
                alignItems="flex-start"
                gap={4}
                py={index === 0 ? 0 : 3}
                pb={index === 0 ? 3 : undefined}
              >
                <Text
                  fontSize="16px"
                  lineHeight="24px"
                  fontWeight="bold"
                  color="black"
                  minW="140px"
                >
                  {item.label}
                </Text>
                <Text
                  fontSize="16px"
                  lineHeight="24px"
                  color="gray.700"
                  textAlign="right"
                  flex="1"
                >
                  {item.value}
                </Text>
              </Flex>
            ))}
          </VStack>
          <Divider mb={5} />

          <Text fontSize="16px" lineHeight="24px" fontWeight="bold" mb={3}>
            Condition Details
          </Text>
          <Flex direction="column" maxH="360px" overflowY="auto" pr={2}>
            <ReadOnlyTipTapMarkdown markdown={condition.content} />
          </Flex>
        </ModalBody>
        <ModalFooter p={0} pt={4} borderTop="none">
          <Button
            width="100%"
            bg="#004a82"
            color="white"
            onClick={onClose}
            _hover={{ bg: '#003a5a' }}
          >
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
