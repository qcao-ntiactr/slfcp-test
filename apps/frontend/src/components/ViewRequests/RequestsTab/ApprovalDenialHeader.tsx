import axios from 'axios';
import { DecisionOutcome } from 'packages/validation';
import { useEffect, useState } from 'react';
import { Text, Flex, Button } from '@chakra-ui/react';

// Use environment variable or fallback to localhost for dev
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const ApprovalDenialHeader = () => {
  const getUnreadApprovalsOrDenials = async (
    outcome: 'approval' | 'denial'
  ) => {
    try {
      const response = await axios.get(`${API_URL}/${outcome}s`);

      if (!Array.isArray(response.data)) {
        console.warn(`Expected array from /${outcome}s, got:`, response.data);
        return [];
      }

      const ids = response.data
        .filter((outcome: DecisionOutcome) => outcome.unread)
        .map((outcome: DecisionOutcome) => outcome.request_id);

      const responses = await Promise.all(
        ids.map((id: number) => axios.get(`${API_URL}/requests/${id}`))
      );

      return responses.map((r) => r.data);
    } catch (err) {
      console.error(`Error fetching ${outcome}s:`, err);
      return [];
    }
  };

  const [unreadApprovalsCount, setUnreadApprovalsCount] = useState<number>(0);
  const [unreadDenialsCount, setUnreadDenialsCount] = useState<number>(0);

  useEffect(() => {
    const fetchCounts = async () => {
      const [approvals, denials] = await Promise.all([
        getUnreadApprovalsOrDenials('approval'),
        getUnreadApprovalsOrDenials('denial'),
      ]);

      setUnreadApprovalsCount(approvals.length);
      setUnreadDenialsCount(denials.length);
    };

    fetchCounts();
  }, []);

  return (
    <Flex gap={5}>
      <Flex alignItems="center" gap={1}>
        <span className="green-dot" />
        <Button variant="unstyled" fontSize="16px" fontWeight="normal">
          <Text as="b">{unreadApprovalsCount}</Text> New Approvals
        </Button>
      </Flex>
      <Flex alignItems="center" gap={1}>
        <span className="red-dot" />
        <Button variant="unstyled" fontSize="16px" fontWeight="normal">
          <Text as="b">{unreadDenialsCount}</Text> New Denials
        </Button>
      </Flex>
    </Flex>
  );
};
