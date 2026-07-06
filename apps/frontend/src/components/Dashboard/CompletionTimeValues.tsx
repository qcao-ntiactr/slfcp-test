import { Box, Flex, Text } from '@chakra-ui/react';

export type completionTimeData = {
  avg_days: string;
  fastest_days: string;
  slowest_days: string;
};

interface CompletionTimeValuesProps {
  data: completionTimeData;
}

export const CompletionTimeValues = ({ data }: CompletionTimeValuesProps) => {
  const dataPoints = [
    { label: 'Average Time', value: parseFloat(data.avg_days) },
    { label: 'Fastest Time', value: parseFloat(data.fastest_days) },
    { label: 'Slowest Time', value: parseFloat(data.slowest_days) },
  ];

  return (
    <Flex
      alignItems="center"
      gap={2}
      p={0}
      flexWrap="wrap"
      maxWidth="700px"
      m="0 auto"
      justifyContent="center"
    >
      {dataPoints.map((dataPoint) => (
        <Box
          minW="200px"
          m="0px auto"
          key={`completion_time_${dataPoint.label}`}
        >
          <Text textAlign="center" fontSize="25px">
            {dataPoint.label}
          </Text>
          <Text textAlign="center" fontSize="60px" fontWeight="semi-bold">
            {dataPoint.value || 'N/A'}
          </Text>
          <Text textAlign="center" fontSize="25px">
            Days
          </Text>
        </Box>
      ))}
    </Flex>
  );
};
