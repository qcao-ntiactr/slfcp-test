import { Box, Center, Select, Text } from '@chakra-ui/react';

import { InquiryMessage } from './InquiryMessage';
import { EntityType, GetInquiriesResponse } from './types';

interface TabPanelContentProps {
  type: EntityType;
  inquiriesForSelectedType: GetInquiriesResponse[EntityType];
  selectedEntityId: number | undefined;
  //eslint-disable-next-line no-unused-vars
  onSelectChange: (type: EntityType, entityId: number) => void;
  tabIndex: number;
}

export const TabPanelContent = ({
  type,
  inquiriesForSelectedType,
  selectedEntityId,
  onSelectChange,
  tabIndex,
}: TabPanelContentProps) => {
  if (!inquiriesForSelectedType || inquiriesForSelectedType.length === 0) {
    return <Text>No entities available under this category.</Text>;
  }

  const selectedRecipient = inquiriesForSelectedType.find(
    (r) => r.recipientEntityId === selectedEntityId
  );
  const messages = selectedRecipient?.inquiry?.messages ?? [];

  /**
   * Renders the messages for the selected inquiry with appropriate fallback states.
   * Shows different UI states based on whether an inquiry exists and if it has messages.
   * Handles cases for no inquiry, no messages, and renders message list when available.
   *
   * @returns JSX element representing the messages or appropriate fallback state
   */
  const renderMessages = () => {
    if (!selectedRecipient?.inquiry) {
      return (
        <Center height="100%">
          <Text>
            No inquiry has been started with{' '}
            {selectedRecipient?.recipientEntityName}.
          </Text>
        </Center>
      );
    }

    return messages.map((message, i) => (
      <InquiryMessage
        key={i}
        message={message.content}
        timeStamp={message.timestamp}
        authoredByUser={message.authoredByUser}
        from={message.sender}
      />
    ));
  };

  return (
    <>
      {inquiriesForSelectedType.length > 1 && (
        <Select
          aria-label="Select entity to view inquiry"
          w="50%"
          ml={tabIndex > 0 ? 'auto' : ''}
          mr={tabIndex > 0 ? '' : 'auto'}
          value={selectedEntityId}
          onChange={(e) => onSelectChange(type, parseInt(e.target.value, 10))}
        >
          {inquiriesForSelectedType.map((inquiryWrapper) => (
            <option
              key={inquiryWrapper.recipientEntityId}
              value={inquiryWrapper.recipientEntityId}
            >
              {inquiryWrapper.recipientEntityName}
            </option>
          ))}
        </Select>
      )}

      <Box overflowY="auto" maxHeight="xl" minHeight="sm" px={3} mt={4}>
        {renderMessages()}
      </Box>
    </>
  );
};
