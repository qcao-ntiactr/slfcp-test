import {
  Box,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { useFormContext } from 'react-hook-form';
import { FrequencyFormDefaults } from '@slfcp/validation';

export const FrequenciesSummary = () => {
  const { watch } = useFormContext();
  const frequencies: FrequencyFormDefaults[] = watch('frequencies');

  return (
    <Box border="1px solid #EDF2F7" mx={2} my={20}>
      <TableContainer>
        <Table variant="simple" size="md" sx={{ tableLayout: 'fixed' }}>
          <Thead>
            <Tr>
              <Th alignContent="flex-start">Frequency Value</Th>
              <Th
                alignContent="flex-start"
                isNumeric
                maxWidth="150px"
                isTruncated
              >
                Transmitted Bandwidth
              </Th>
              <Th alignContent="flex-start" maxWidth="150px" isTruncated>
                Signal Is Filtered
              </Th>
              <Th alignContent="flex-start" maxWidth="150px" isTruncated>
                Nature of Modulating Signals
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {frequencies.map((frequencyForm, index) => (
              <Tr key={`Tr-${index}`}>
                <Td>{frequencyForm.frequency || '--'}</Td>
                <Td>{frequencyForm.transmitted_bandwidth || '--'}</Td>
                <Td>
                  {frequencyForm.transmitted_bandwidth_is_signal_filtered ||
                    '--'}
                </Td>
                <Td>{frequencyForm.nature_of_modulating_signals || '--'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
};
