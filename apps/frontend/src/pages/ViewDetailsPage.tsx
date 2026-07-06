import { Box, Flex, Text } from '@chakra-ui/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { roleStatusActions } from '@slfcp/role-actions-access-control';
import { differenceInDays } from 'date-fns';

import {
  CommentsAndActionsForm,
  FeedbackTable,
} from '../components/ViewDetails/Feedback/';
import { ViewDetailsTabs } from '../components/ViewDetails/Tabs/ViewDetailsTabs';
import { getRequestById } from '../api/Requests';
import { getUserByExternalId, BackendUser } from '../api/Users';
import { useHybridAuth, UserRole } from '../context/HybridAuthContext';
import { RequestDetails } from '../types';
import { RequestHeader } from '../components/Layout/RequestHeader';

export const ViewDetailsPage = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { user } = useHybridAuth();
  const role = user?.role;

  const [request, setRequest] = useState<RequestDetails | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);

  const daysToOperation = useMemo(() => {
    if (!request?.launch_datetime_primary) return null;

    const launchDate = new Date(request.launch_datetime_primary);
    return differenceInDays(launchDate, currentDate);
  }, [request?.launch_datetime_primary, currentDate]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const updateAtMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      nextMidnight.setHours(0, 0, 0, 0);

      const msUntilMidnight = nextMidnight.getTime() - now.getTime();

      timeoutRef.current = setTimeout(() => {
        setCurrentDate(new Date());

        intervalRef.current = setInterval(
          () => {
            setCurrentDate(new Date());
          },
          24 * 60 * 60 * 1000
        ); // every 24 hours
      }, msUntilMidnight);
    };

    updateAtMidnight();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!requestId) {
      navigate('/view-requests');
      return;
    }

    const fetchRequest = async () => {
      try {
        const data = await getRequestById(requestId, user?.id);
        setRequest(data);
      } catch (err) {
        console.error('Error fetching request:', err);
        navigate('/view-requests');
      }
    };

    fetchRequest();
  }, [requestId, navigate, user?.id]);

  // Fetch backend user data to get real voting permissions
  useEffect(() => {
    if (!user?.id) return;

    const fetchBackendUser = async () => {
      try {
        const userData = await getUserByExternalId(user.id);
        setBackendUser(userData);
      } catch (err) {
        console.error('Error fetching backend user data:', err);
        // If we can't fetch backend user data, fall back to frontend mock data
        setBackendUser(null);
      }
    };

    fetchBackendUser();
  }, [user?.id]);

  const status = request?.status;
  const baseActionOptions =
    role && status
      ? roleStatusActions[role.toLowerCase()]?.[status]
      : undefined;

  // Hide actions dropdown entirely for federal agency users who cannot vote
  const actionOptions = useMemo(() => {
    if (!baseActionOptions) return undefined;

    // If entity is inactive, hide all actions for federal agency users
    const isEntityActive =
      backendUser?.entity?.active ?? user?.isEntityActive ?? true;
    if (!isEntityActive && role?.toLowerCase() === 'federal') {
      return undefined;
    }

    // If user is federal agency and cannot vote, hide the entire actions dropdown
    if (role?.toLowerCase() === 'federal') {
      // Use backend user data if available, otherwise fall back to frontend mock data
      const canConcur = backendUser?.can_concur ?? user?.canConcur ?? false;
      if (!canConcur) {
        return undefined;
      }
    }

    return baseActionOptions;
  }, [
    baseActionOptions,
    role,
    backendUser?.can_concur,
    backendUser?.entity?.active,
    user?.canConcur,
    user?.isEntityActive,
  ]);

  // Determine if user can add comments based on role and request status
  const canAddComments = useMemo(() => {
    if (!user || !role || !status) return false;

    // Check if entity is active
    const isEntityActive =
      backendUser?.entity?.active ?? user?.isEntityActive ?? true;
    if (!isEntityActive && role === UserRole.federal) {
      return false;
    }

    // NTIA users can comment during active NTIA review phases (not during revision phases)
    if (role === UserRole.ntia) {
      return ['UNDER_NTIA_INITIAL_REVIEW', 'UNDER_NTIA_FINAL_REVIEW'].includes(
        status
      );
    }

    // Federal agency users can only comment during federal review phase
    if (role === UserRole.federal) {
      return status === 'UNDER_FEDERAL_AGENCIES_REVIEW';
    }

    // Commercial users cannot add comments
    return false;
  }, [user, role, status, backendUser?.entity?.active, user?.isEntityActive]);

  // Show the form if user can add comments OR has actions available
  const shouldShowCommentsAndActionsForm = useMemo(() => {
    // Show form if user can add comments (NTIA or Federal users)
    if (canAddComments) return true;

    // Show form if user has actions available (based on role-status)
    return actionOptions && actionOptions.length > 0;
  }, [canAddComments, actionOptions]);

  if (!request || !role || daysToOperation === null)
    return <Text>Loading...</Text>;

  return (
    <Flex flexDir="column" gap={5} mx={5}>
      <RequestHeader
        headerText="View Details"
        status={request.status}
        requestId={request.root_request_id || request.id}
        revisionNumber={request.revision}
        daysToOperation={daysToOperation}
      />
      <ViewDetailsTabs request={request} />

      {user && (
        <Box p={9} w="100%" backgroundColor="#F5F7FA">
          {shouldShowCommentsAndActionsForm && (
            <CommentsAndActionsForm
              user={{
                ...user,
                isEntityActive:
                  backendUser?.entity?.active ?? user.isEntityActive ?? true,
              }}
              status={request.status}
              requestId={request.id}
              rootRequestId={request.root_request_id}
              actionOptions={actionOptions}
              canAddComments={canAddComments}
            />
          )}
          <FeedbackTable
            role={role}
            requestId={request.root_request_id || request.id}
          />
        </Box>
      )}
    </Flex>
  );
};
