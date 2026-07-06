import { Box, Divider, Flex, Heading, Text } from '@chakra-ui/react';

import { formatRequestId, mapStatusToStatusGroup } from '../utils/Helpers';
import { BackendRequestStatus } from '../../types';
import { ColoredLabel } from '../Label/ColoredLabel';
import { RequestStatusLabel } from '../ViewRequests/RequestStatusLabel';

export interface RequestHeaderProps {
  headerText: string;
  requestId: number;
  revisionNumber: number;
  status: BackendRequestStatus;
  daysToOperation?: number;
}

export const RequestHeader = ({
  headerText,
  requestId,
  revisionNumber,
  status,
  daysToOperation,
}: RequestHeaderProps) => {
  function getRevisionLabel(revisionNumber: number): string {
    if (!Number.isInteger(revisionNumber) || revisionNumber < 0) {
      throw new Error('Revision number must be a non-negative integer.');
    }

    const n = revisionNumber + 1;
    const remainderTen = n % 10;
    const remainderHundred = n % 100;

    let suffix: string;
    if (remainderHundred >= 11 && remainderHundred <= 13) {
      suffix = 'TH';
    } else {
      switch (remainderTen) {
        case 1:
          suffix = 'ST';
          break;
        case 2:
          suffix = 'ND';
          break;
        case 3:
          suffix = 'RD';
          break;
        default:
          suffix = 'TH';
      }
    }

    return `${n}${suffix} REVISION REQUESTED`;
  }

  return (
    <>
      <Box>
        <Heading mt={5}>{headerText}</Heading>
        <Flex alignItems="center" gap={4}>
          <Text>{`Request ID: ${formatRequestId(requestId)}`}</Text>
          {headerText === 'View Details' && (
            <RequestStatusLabel status={mapStatusToStatusGroup(status)} />
          )}
          {headerText === 'Revise Request' && (
            <ColoredLabel
              labelColor="#69707D33"
              labelText={getRevisionLabel(revisionNumber)}
            />
          )}

          {daysToOperation !== undefined && daysToOperation !== null && (
            <ColoredLabel
              labelColor="#eed1d0"
              labelText={`${daysToOperation} DAYS TO OPERATION`}
            />
          )}
        </Flex>
        {headerText === 'View Details' && revisionNumber > 0 && (
          <Text
            color="#005EC4"
            fontWeight="medium"
          >{`REVISION ${revisionNumber}`}</Text>
        )}
      </Box>

      <Divider mb={4} borderColor="#D3DAE6" />
    </>
  );
};
