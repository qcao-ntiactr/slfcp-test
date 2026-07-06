import { Box, Center, Divider, Flex, Heading, Text } from '@chakra-ui/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useHybridAuth } from '../context/HybridAuthContext';
import { fetchInquiries, postMessage } from '../api/Inquiries';
import { useMarkInquiryMessagesAsRead } from '../hooks/UseInquiries';
import {
  GetInquiriesResponse,
  SelectedEntityPerTab,
} from '../components/Inquiries/types';
import { InquiryTabs } from '../components/Inquiries/InquiryTabs';
import { InquiryInput } from '../components/Inquiries/InquiryInput';
import { getRequestById } from '../api/Requests';
import { RequestDetails, RequestStatusGroup } from '../types';

export const InquiryPage = () => {
  const { requestId } = useParams<{ requestId: string }>();

  const { user } = useHybridAuth();
  const userEmail = user?.email;

  const [inquiries, setInquiries] = useState<GetInquiriesResponse>();
  const [request, setRequest] = useState<RequestDetails>();
  const [selectedInquiryId, setSelectedInquiryId] = useState<number>();
  const [selectedRecipientEntityId, setSelectedRecipientEntityId] =
    useState<number>();
  const [isLoading, setIsLoading] = useState(false);

  const [tabIndex, setTabIndex] = useState(0);
  const [selectedEntityIdPerTab, setSelectedEntityIdPerTab] =
    useState<SelectedEntityPerTab>({});

  // Hook for marking messages as read
  const markInquiryMessagesAsReadMutation = useMarkInquiryMessagesAsRead();

  // Memoize parsed requestId to avoid recalculation
  const requestIdParsed = useMemo(() => {
    const parsed = parseInt(requestId || '', 10);
    return isNaN(parsed) ? null : parsed;
  }, [requestId]);

  const fetchRequestById = useCallback(async () => {
    if (!requestIdParsed) {
      return;
    }

    setIsLoading(true);
    try {
      const data = await getRequestById(requestId || '');
      setRequest(data);
    } catch (error) {
      console.error('Failed to fetch request with that id:', error);
      setRequest(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [requestIdParsed]);

  /**
   * Fetches inquiry data for the current request with proper error handling and loading state management.
   * Only executes if all required parameters (requestId, userEmail, user roles) are available.
   * Updates the inquiries state and manages loading state during the fetch operation.
   */
  const fetchInquiriesData = useCallback(async () => {
    if (!requestIdParsed || !userEmail || !user?.role) {
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchInquiries(requestIdParsed, userEmail);
      setInquiries(data);
    } catch (error) {
      console.error('Failed to fetch inquiries:', error);
      setInquiries(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [requestIdParsed, userEmail, user?.role]);

  useEffect(() => {
    fetchInquiriesData();
    fetchRequestById();
  }, [fetchInquiriesData]);

  // Optimized inquiry lookup using flat map instead of nested loops
  const selectedInquiry = useMemo(() => {
    if (!inquiries || !selectedInquiryId) return undefined;

    const allEntries = Object.values(inquiries).flat();
    const entry = allEntries.find(
      (entry) => entry.inquiry?.id === selectedInquiryId
    );
    return entry?.inquiry;
  }, [inquiries, selectedInquiryId]);

  // Derived state: does the current inquiry have unread messages from others?
  const hasUnreadFromOthers = useMemo(() => {
    if (!selectedInquiry) return false;
    return selectedInquiry.messages?.some((m) => !m.authoredByUser) ?? false;
  }, [selectedInquiry]);

  // Effect 1: decide when to mark read (trigger only when inquiry selection changes)
  useEffect(() => {
    if (!selectedInquiryId || !requestIdParsed || !userEmail) return;
    if (!hasUnreadFromOthers) return;

    const timeoutId = setTimeout(() => {
      markInquiryMessagesAsReadMutation.mutate({
        requestId: requestIdParsed,
        inquiryId: selectedInquiryId,
        userEmail,
      });
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [selectedInquiryId, hasUnreadFromOthers, requestIdParsed, userEmail]);

  /**
   * Handles sending a message to the selected inquiry.
   * Validates required fields, constructs the message payload, sends the message via API,
   * and refreshes the inquiries data upon successful send.
   *
   * @param messageText - The content of the message to send
   */
  const handleSendMessage = useCallback(
    async (messageText: string) => {
      if (
        !user?.displayName ||
        !userEmail ||
        !messageText ||
        !requestIdParsed
      ) {
        console.error('Missing required values for sending message:', {
          displayName: !!user?.displayName,
          userEmail: !!userEmail,
          messageText: !!messageText,
          requestId: !!requestIdParsed,
        });
        return;
      }

      // Must have either an existing inquiry or a recipient to create new inquiry
      if (!selectedInquiryId && !selectedRecipientEntityId) {
        console.error('No inquiry or recipient selected for sending message');
        return;
      }

      try {
        const payload = {
          userEmail,
          content: messageText,
          requestId: requestIdParsed,
          inquiryId: selectedInquiryId, // Can be undefined for new inquiries
          recipientEntityId: selectedRecipientEntityId,
        };

        // Backend will handle both cases:
        // - If inquiryId exists: add message to existing inquiry
        // - If inquiryId is undefined: create new inquiry + first message
        await postMessage(payload);

        await fetchInquiriesData();
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    },
    [
      user?.displayName,
      userEmail,
      requestIdParsed,
      selectedInquiryId,
      selectedRecipientEntityId,
      fetchInquiriesData,
    ]
  );

  // Early return for invalid request ID
  if (!requestIdParsed) {
    return (
      <Flex flexDir="column" px={7}>
        <Box>
          <Heading mt={4} mb={4}>
            Inquiry
          </Heading>
          <Divider borderColor="#D3DAE6" mb={12} />
        </Box>
        <Center>
          <Text textAlign="center" fontSize="18px" color="red.500">
            Invalid request ID
          </Text>
        </Center>
      </Flex>
    );
  }

  /**
   * Renders the appropriate content based on the current application state.
   * Shows loading indicator, error message, or the inquiry tabs component
   * depending on loading state and data availability.
   *
   * @returns JSX element representing the current state of the inquiry page
   */
  const renderContent = () => {
    if (isLoading) {
      return (
        <Center>
          <Text textAlign="center" fontSize="18px">
            Loading inquiries...
          </Text>
        </Center>
      );
    }

    if (!inquiries || !userEmail) {
      return (
        <Center>
          <Text textAlign="center" fontSize="18px">
            Inquiries could not be fetched.
          </Text>
        </Center>
      );
    }

    return (
      <InquiryTabs
        groupedInquiries={inquiries}
        userEmail={userEmail}
        setSelectedInquiryId={setSelectedInquiryId}
        setSelectedRecipientEntityId={setSelectedRecipientEntityId}
        tabIndex={tabIndex}
        setTabIndex={setTabIndex}
        selectedEntityIdPerTab={selectedEntityIdPerTab}
        setSelectedEntityIdPerTab={setSelectedEntityIdPerTab}
      />
    );
  };

  const isFinalStatus = useMemo(() => {
    return (
      (request && request?.status === RequestStatusGroup.Approved) ||
      request?.status === RequestStatusGroup.ApprovedWithConditions ||
      request?.status === RequestStatusGroup.Denied
    );
  }, [request]);

  return (
    <Flex flexDir="column" px={4}>
      <Box>
        <Heading mt={4} mb={4}>
          Inquiry
        </Heading>
        <Divider borderColor="#D3DAE6" mb={12} />
      </Box>
      <Box backgroundColor="#F5F7FA" pb={12}>
        {renderContent()}
        {request && (
          <InquiryInput
            handleSendMessage={handleSendMessage}
            isClosed={selectedInquiry?.closed}
            requestIsFinalized={isFinalStatus}
          />
        )}
      </Box>
    </Flex>
  );
};
