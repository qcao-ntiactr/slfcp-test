import { Box, Center, Flex, Spinner, Text } from '@chakra-ui/react';
import { useState } from 'react';

import {
  useRequestsOverTime,
  useRequestCompletionTime,
  useRequestsByCommercialEntity,
  useRequestsByStatus,
  Timeframe,
} from '../hooks/UseDashboard';
import { ViewContainer } from '../components/Dashboard/ViewContainer';
import { CompletionTimeValues } from '../components/Dashboard/CompletionTimeValues';
import { TimeframeFilter } from '../components/Dashboard/TimeframeFilter';
import DashboardBarChart, {
  DataPoint,
} from '../components/Dashboard/HorizontalBarChart';
import { RequestsByCommercialEntityData, RequestsByStatusData } from '../types';

export const Dashboard = () => {
  const [timeframe, setTimeframe] = useState<Timeframe>('week');

  const { data: requestsOverTime, isLoading: isLoadingOverTime } =
    useRequestsOverTime(timeframe);

  const { data: completionTime, isLoading: isLoadingCompletion } =
    useRequestCompletionTime(timeframe);

  const { data: requestsByEntity, isLoading: isLoadingEntity } =
    useRequestsByCommercialEntity();

  const { data: requestsByStatus, isLoading: isLoadingStatus } =
    useRequestsByStatus();

  const isLoading =
    isLoadingOverTime ||
    isLoadingCompletion ||
    isLoadingEntity ||
    isLoadingStatus;

  if (isLoading) return <Spinner />;

  const colorPalette = [
    '#7B3F98',
    '#2E8B57',
    '#1E90FF',
    '#C0392B',
    '#d6ac04ff',
    '#1ec5bdff',
  ];

  const parsedStatusData: DataPoint[] = (requestsByStatus || []).map(
    (statusData: RequestsByStatusData) => ({
      label: statusData.status_group,
      value: Number(statusData.request_count),
    })
  );

  const parsedRequestsByEntity: DataPoint[] = (requestsByEntity || []).map(
    (countData: RequestsByCommercialEntityData) => ({
      label: countData.entity_name,
      value: Number(countData.total_submissions),
    })
  );

  const CONTENT_MAX_WIDTH = '1700px';

  return (
    <Box w="96vw" m="0 auto" p={5}>
      <Box maxW={CONTENT_MAX_WIDTH} mx="auto">
        <TimeframeFilter timeframe={timeframe} setTimeframe={setTimeframe} />

        <Flex gap={2} w="100%" mt={8} justifyContent="center">
          <ViewContainer
            backgroundColor="#edf3f8"
            headerText="Requests Over Time"
            descriptionText="Displays the number of requests submitted within the selected time frame."
          >
            <Center>
              <Box p={8}>
                <Text textAlign="center" fontSize="60px" fontWeight="semi-bold">
                  {requestsOverTime[0].total_requests}
                </Text>
                <Text textAlign="center" fontSize="25px">
                  Requests Submitted
                </Text>
              </Box>
            </Center>
          </ViewContainer>

          <ViewContainer
            backgroundColor="#edf3f8"
            headerText="Request Completion Time"
            descriptionText="Duration from when a request is submitted to when it reaches its final status - whether approved, approved with conditions, or denied."
          >
            {completionTime && (
              <CompletionTimeValues data={completionTime[0]} />
            )}
          </ViewContainer>
        </Flex>

        <Flex mt={2} w="100%" justifyContent="center">
          <ViewContainer
            backgroundColor="#edf3f8"
            headerText="Request Distribution Overview"
            descriptionText="Displays the volume and status of requests/revisions submitted by commercial entities participating in the SLFCP."
            p={8}
          >
            <Flex wrap="wrap" gap={5} justifyContent="center">
              <ViewContainer
                backgroundColor="#f1f0f0"
                headerText="Requests By Commercial Entity"
                descriptionText="Shows how many requests have been submitted by each commercial entity."
                hasBorder
                flex="1 1 450px"
                maxW="750px"
                w="100%"
                mx="auto"
                minW={'600px'}
              >
                <Center
                  p={3}
                  border="1px solid black"
                  w="100%"
                  backgroundColor="white"
                >
                  <DashboardBarChart
                    data={parsedRequestsByEntity}
                    colorPalette={colorPalette}
                    yAxisLabel="Commercial Entity"
                  />
                </Center>
              </ViewContainer>

              <ViewContainer
                backgroundColor="#f1f0f0"
                headerText="Requests By Status"
                descriptionText="Shows the current distribution of requests by their workflow status (e.g. Approved, Denied, Under Review)."
                hasBorder
                flex="1 1 450px"
                maxW="765px"
                w="100%"
                mx="auto"
                minW={'600px'}
              >
                <Center
                  p={3}
                  border="1px solid black"
                  w="100%"
                  backgroundColor="white"
                >
                  <DashboardBarChart
                    data={parsedStatusData}
                    colorPalette={colorPalette}
                    yAxisLabel="Status"
                  />
                </Center>
              </ViewContainer>
            </Flex>
          </ViewContainer>
        </Flex>
      </Box>
    </Box>
  );
};
