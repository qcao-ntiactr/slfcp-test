import { Box, Flex, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { FeedbackTable } from '../components/ViewDetails/Feedback/FeedbackTable/FeedbackTable';
import { getRequestById } from '../api/Requests';
import { useHybridAuth, UserRole } from '../context/HybridAuthContext';
import { RequestDetails } from '../types';
import { RequestHeader } from '../components/Layout/RequestHeader';
import { formatRequestId } from '../components/utils/Helpers';
import { getRequestedRevisionsByRequestId } from '../api/RequestedRevisions';
import { ReviseRequestForm } from '../components/RequestForm/ReviseRequestForm';

export const ReviseRequestPage = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const { user } = useHybridAuth();
  const role = user?.role;

  const [request, setRequest] = useState<RequestDetails | null>(null);
  const [requestedChanges, setRequestedChanges] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    if (!requestId) return;

    const fetchRequest = async () => {
      try {
        const data = await getRequestById(requestId, user?.id);
        if (
          !data.status.split('_').includes('REVISION') ||
          role !== UserRole.commercial
        ) {
          navigate('/view-requests');
          return;
        }
        setRequest(data);
      } catch (err) {
        console.error('Error fetching request:', err);
        navigate('/view-requests');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequest();
  }, [requestId, navigate, user?.id, role]);

  useEffect(() => {
    const fetchRequestedChanges = async () => {
      try {
        if (request) {
          const data = await getRequestedRevisionsByRequestId(request.id);
          setRequestedChanges(data.requested_changes);
        }
      } catch (err) {
        console.error('Error fetching requested changes:', err);
      }
    };

    fetchRequestedChanges();
  }, [request]);

  if (isLoading || !request || !role) {
    return <Text>Loading...</Text>;
  }

  return (
    <Flex flexDir="column" gap={5} mx={5}>
      <RequestHeader
        headerText="Revise Request"
        status={request.status}
        requestId={request.root_request_id || request.id}
        revisionNumber={request.revision}
      />

      <Box backgroundColor="#F8E9E9" px={4} pt={4} pb={6} mb={3}>
        <Text fontWeight="bold" fontSize="16px" mb={2}>
          Revision Requested
        </Text>
        <Text fontSize="16px">
          {`NTIA needs you to revise and resubmit ${formatRequestId(request.root_request_id || request.id)} due to the reasons below:`}
        </Text>
        <Text>
          <Box as="pre" fontFamily="body">
            {requestedChanges[0] || '{Could not load requested changes.}'}
          </Box>
        </Text>
      </Box>

      <Box px={4} mb={0}>
        <Text fontWeight="bold">Request Information</Text>
        <Text>Edit request below and resubmit for approval.</Text>
      </Box>

      <Box w="100%" maxWidth="1500px" margin="0 auto" pt={0} px={4}>
        <ReviseRequestForm requestToRevise={request} />
      </Box>

      <Box p={9} w="100%" backgroundColor="#F5F7FA">
        <FeedbackTable
          role={role}
          requestId={request.root_request_id || request.id}
        />
      </Box>
    </Flex>
  );
};
