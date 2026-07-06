import {
  Box,
  Heading,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { Frequency } from 'apps/frontend/src/types.ts';

import { generateFrequencyColumns } from './FrequencyColumns.tsx';

export interface FrequenciesTabProps {
  frequencies: Frequency[];
}

export const FrequenciesTab = ({ frequencies }: FrequenciesTabProps) => {
  if (!frequencies || frequencies.length === 0) {
    return <Text>No frequency data available.</Text>;
  }

  const minWidths: Record<string, string> = {
    transmitted_bandwidth_justification: '300px',
    location_of_transmitter_on_vehicle_or_platform: '200px',
    location_of_receiving_ground_station: '200px',
    transmission_start: '170px',
    transmission_end: '170px',
    eirp: '150px',
    antenna_type: '150px',
  };

  function getColumnMinWidth(key: string): string {
    return minWidths[key] ?? '120px';
  }

  const frequencyColumns = generateFrequencyColumns(frequencies);

  return (
    <Box>
      <Heading size="md" mb={7}>
        Frequencies
      </Heading>

      <Box overflow="auto" tabIndex={0} maxW="100%" maxH="container.sm" pb={6}>
        <Table size="sm" variant="simple" sx={{ tableLayout: 'auto' }}>
          <Thead>
            <Tr>
              {frequencyColumns.map((col) => (
                <Th
                  key={col.key}
                  whiteSpace="normal"
                  textTransform={'none'}
                  color="black"
                  minW={getColumnMinWidth(col.key)}
                  sx={
                    col.key === 'frequency'
                      ? {
                          position: 'sticky',
                          left: 0,
                          zIndex: 1,
                          bg: 'white',
                        }
                      : {}
                  }
                >
                  {col.header}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {frequencies.map((freq, rowIdx) => (
              <Tr key={rowIdx}>
                {frequencyColumns.map((col) => (
                  <Td
                    key={col.key}
                    sx={
                      col.key === 'frequency'
                        ? {
                            position: 'sticky',
                            left: 0,
                            zIndex: 1,
                            bg: 'white',
                          }
                        : {}
                    }
                  >
                    {col.render(freq)}
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
};
