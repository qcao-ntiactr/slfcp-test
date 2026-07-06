import { Dispatch, SetStateAction } from 'react';
import { Flex, Select, Text } from '@chakra-ui/react';

import { Timeframe } from '../../hooks/UseDashboard';

interface TimeframeFilterProps {
  timeframe: Timeframe;
  setTimeframe: Dispatch<SetStateAction<Timeframe>>;
}

export const TimeframeFilter = ({
  timeframe,
  setTimeframe,
}: TimeframeFilterProps) => {
  const labelId = 'timeframe-filter-label';

  return (
    <Flex
      justifyContent="center"
      flexDirection="column"
      maxW="xl"
      m="0px auto"
      mb={4}
    >
      <Text
        id={labelId}
        backgroundColor="#edf3f8"
        textAlign="center"
        fontWeight="bold"
        p={1}
      >
        Timeframe
      </Text>

      <Select
        width="100%"
        value={timeframe}
        onChange={(e) => setTimeframe(e.target.value as Timeframe)}
        borderTopRadius="none"
        aria-labelledby={labelId}
      >
        <option value="week">Last Week</option>
        <option value="month">Last Month</option>
        <option value="quarter">Last Quarter</option>
      </Select>
    </Flex>
  );
};
