import { useMemo } from 'react';
import { Box, Button, Badge } from '@chakra-ui/react';
import { getDaysToOperation } from '@slfcp/utils';
import { Link } from 'react-router-dom';
import { GoPencil } from 'react-icons/go';
import { HiOutlineEye } from 'react-icons/hi2';
import { IoInformationCircleOutline } from 'react-icons/io5';

import {
  formatFrequencies,
  formatRequestId,
  mapStatusToStatusGroup,
} from '../../utils/Helpers';
import { RequestStatusLabel } from '../RequestStatusLabel';
import {
  formatUnreadMessageCount,
  getUnreadMessageAriaLabel,
  shouldShowUnreadBadge,
} from '../utils/UnreadMessageHelpers';
import { UserRole } from '../../../context/HybridAuthContext';
import { RequestSummary } from '../../../types';
import { formatDateOrEmpty, parseValidDate } from '../../../utils/dateUtils';

import { RequestTableColumn } from './filtering/types';

interface UseRequestTableColumnsProps {
  currentDate: Date;
  timezone: string;
  userRole?: UserRole;
}

export const useRequestTableColumns = ({
  currentDate,
  timezone,
  userRole,
}: UseRequestTableColumnsProps): RequestTableColumn[] => {
  return useMemo(() => {
    const nameOfLicenseeColumn: RequestTableColumn = {
      header: 'LICENSEE NAME',
      key: 'name_of_licensee',
      sortKey: 'name_of_licensee',
      filterConfig: { type: 'text', field: 'name_of_licensee' },
      render: (request: RequestSummary) => request.name_of_licensee || '',
    };

    const primaryPocEmailColumn: RequestTableColumn = {
      header: 'EMAIL',
      key: 'primary_poc_email',
      sortKey: 'primary_poc_email',
      filterConfig: { type: 'text', field: 'primary_poc_email' },
      render: (request: RequestSummary) => request.primary_poc_email || '',
    };

    const launchDateColumn: RequestTableColumn = {
      header: 'LAUNCH DATE',
      key: 'launch_datetime_primary',
      sortKey: 'launch_datetime_primary',
      filterConfig: { type: 'date', field: 'launch_datetime_primary' },
      render: (request: RequestSummary) =>
        formatDateOrEmpty(request.launch_datetime_primary, 'MM-dd-yyyy'),
    };

    const reviseRequestColumn: RequestTableColumn = {
      header: 'REVISE',
      key: 'reviseRequest',
      render: (request: RequestSummary) =>
        request.status.includes('REVISION') ? (
          <Box textAlign="center" w="fit-content" p={3}>
            <Button
              variant="ghost"
              as={Link}
              aria-label={`Submit revision for request ${request.id}`}
              to={`/revise-request/${request.root_request_id || request.id}`}
              py={5}
            >
              <GoPencil size={20} />
            </Button>
          </Box>
        ) : null,
    };

    return [
      {
        header: 'STATUS',
        key: 'status',
        filterConfig: { type: 'status' },
        render: (request: RequestSummary) => (
          <RequestStatusLabel status={mapStatusToStatusGroup(request.status)} />
        ),
      },
      {
        header: 'SUBMITTED DATE',
        key: 'submitted_date',
        sortKey: 'createdAt',
        filterConfig: { type: 'date', field: 'createdAt' },
        render: (request: RequestSummary) =>
          formatDateOrEmpty(request.createdAt, 'MM-dd-yyyy'),
      },
      {
        header: 'DAYS TO OPERATION',
        key: 'daysToOperation',
        sortKey: 'daysToOperation',
        filterConfig: { type: 'number', field: 'daysToOperation' },
        render: (request: RequestSummary) => {
          const launchDate = parseValidDate(request.launch_datetime_primary);

          if (!launchDate) return '';

          return getDaysToOperation(launchDate, currentDate, timezone);
        },
      },
      {
        header: 'MISSION NAME',
        key: 'mission_name',
        sortKey: 'mission_name',
        filterConfig: { type: 'text', field: 'mission_name' },
        render: (request: RequestSummary) => request.mission_name || '',
      },
      {
        header: 'LAUNCH SERIAL NUMBER',
        key: 'id',
        sortKey: 'id',
        filterConfig: { type: 'serialNumber', field: 'id' },
        render: (request: RequestSummary) =>
          formatRequestId(
            request.root_request_id || request.id,
            request.createdAt
          ),
      },
      ...(userRole !== UserRole.commercial ? [launchDateColumn] : []),
      userRole === UserRole.commercial
        ? primaryPocEmailColumn
        : nameOfLicenseeColumn,
      {
        header: 'FREQUENCIES',
        key: 'frequencies',
        render: (request: RequestSummary) => {
          const freqString = formatFrequencies(request.frequencies);
          if (!freqString) return null;
          return (
            <Box
              maxW="350px"
              minW="50px"
              overflowWrap="anywhere"
              whiteSpace="normal"
            >
              {freqString}
            </Box>
          );
        },
      },
      {
        header: 'VIEW DETAILS',
        key: 'viewDetails',
        render: (request: RequestSummary) => (
          <Button
            variant="ghost"
            w="80px"
            as={Link}
            aria-label={`View details of request ${request.id}`}
            to={`/view-details/${request.root_request_id || request.id}`}
            p={3}
          >
            <HiOutlineEye size={20} />
          </Button>
        ),
      },
      ...(userRole === UserRole.commercial ? [reviseRequestColumn] : []),
      {
        header: 'INQUIRIES',
        key: 'inquiries',
        render: (request: RequestSummary) => (
          <Button
            as={Link}
            to={`/inquiries/${request.root_request_id || request.id}`}
            variant="ghost"
            aria-label={`View inquiries for request ${request.id}`}
            p={2}
            w="80px"
            h="auto"
          >
            <Box position="relative" w="24px" h="24px" mx="auto">
              <IoInformationCircleOutline size={20} />
              {shouldShowUnreadBadge(request.unreadMessageCount) && (
                <Badge
                  position="absolute"
                  top="-9px"
                  right="-8px"
                  borderRadius="full"
                  bg="red.600"
                  color="white"
                  fontSize="xs"
                  minW="20px"
                  h="20px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  zIndex={1}
                  aria-label={getUnreadMessageAriaLabel(
                    request.unreadMessageCount,
                    request.id
                  )}
                  role="status"
                >
                  {formatUnreadMessageCount(request.unreadMessageCount)}
                </Badge>
              )}
            </Box>
          </Button>
        ),
      },
    ];
  }, [currentDate, timezone, userRole]);
};
