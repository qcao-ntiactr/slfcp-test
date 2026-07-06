import {
  Box,
  Heading,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { useMemo } from 'react';
import { useFormContext, FieldErrors } from 'react-hook-form';
import { FrequencyFormDefaults, PortalFormDefaults } from '@slfcp/validation';

import { ActionButtons } from './ActionButtons';
import { TableCell } from './TableCell';

interface FrequencyFormTableProps {
  indexOfSelectedFreqForm?: number;
  // eslint-disable-next-line no-unused-vars
  editFreqFormCallback: (form: FrequencyFormDefaults, index: number) => void;
  // eslint-disable-next-line no-unused-vars
  deleteFreqFormCallback: (index: number) => void;
  isEditingFrequency: boolean;
}

export const FrequencyFormTable = ({
  indexOfSelectedFreqForm,
  editFreqFormCallback,
  deleteFreqFormCallback,
  isEditingFrequency,
}: FrequencyFormTableProps) => {
  const {
    watch,
    formState: { errors },
  } = useFormContext<PortalFormDefaults>();

  const numberOfFrequencies: number = watch('number_of_frequencies') || 0;
  const createdFrequencyForms: FrequencyFormDefaults[] =
    watch('frequencies') || [];

  const numOfFrequenciesIsValid =
    !isNaN(numberOfFrequencies) &&
    (!errors.number_of_frequencies ||
      errors?.number_of_frequencies?.message ===
        'No frequencies have been added' ||
      errors?.number_of_frequencies?.message?.toString().startsWith('Only')); // Accepts 'Only X out of Y' errors

  const getTableTitle = useMemo(() => {
    const createdFormCount = createdFrequencyForms?.length || 0;

    if (numOfFrequenciesIsValid) {
      return `${createdFormCount} out of ${numberOfFrequencies} ${
        numberOfFrequencies === 1 ? 'frequency' : 'frequencies'
      } added`;
    }

    // If invalid (e.g., completely wrong value), fallback to basic count
    return `${createdFormCount} ${createdFormCount === 1 ? 'frequency' : 'frequencies'} added`;
  }, [createdFrequencyForms, numberOfFrequencies, numOfFrequenciesIsValid]);

  return (
    <Box mx={2} my={2}>
      <Heading my={4} size="md">
        {getTableTitle}
      </Heading>
      <TableContainer border="1px solid #EDF2F7">
        <Table variant="simple" size="md" sx={{ tableLayout: 'fixed' }}>
          <Thead>
            <Tr>
              <Th textAlign="left" maxWidth="200px" isNumeric isTruncated>
                Frequency Value
              </Th>
              <Th textAlign="left" maxWidth="200px" isNumeric isTruncated>
                Transmitted Bandwidth
              </Th>
              <Th textAlign="left" maxWidth="200px" isTruncated>
                Signal Is Filtered
              </Th>
              <Th textAlign="left" isTruncated maxWidth="200px">
                Nature of Modulating Signals
              </Th>
              <Th maxWidth="200px" textAlign="left">
                Actions
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {createdFrequencyForms?.map((frequencyForm, index) => {
              const frequencyErrors = errors.frequencies as unknown as Array<
                FieldErrors<FrequencyFormDefaults>
              >;
              const hasError = frequencyErrors?.[index];

              return (
                <Tr
                  key={`Tr-${index}`}
                  fontWeight={
                    index === indexOfSelectedFreqForm ? 'bold' : 'normal'
                  }
                  backgroundColor={hasError ? 'red.50' : 'transparent'}
                  border={hasError ? '1px solid' : 'none'}
                  borderColor={hasError ? 'red.300' : 'transparent'}
                >
                  <TableCell
                    data={frequencyForm.frequency}
                    isSelectedFreqForm={index === indexOfSelectedFreqForm}
                    hasError={!!hasError}
                  />
                  <TableCell
                    data={frequencyForm.transmitted_bandwidth}
                    isSelectedFreqForm={index === indexOfSelectedFreqForm}
                    hasError={!!hasError}
                  />
                  <TableCell
                    data={
                      frequencyForm.transmitted_bandwidth_is_signal_filtered
                    }
                    isSelectedFreqForm={index === indexOfSelectedFreqForm}
                    hasError={!!hasError}
                  />
                  <TableCell
                    data={String(frequencyForm.nature_of_modulating_signals)}
                    isSelectedFreqForm={index === indexOfSelectedFreqForm}
                    hasError={!!hasError}
                  />
                  <Td>
                    <ActionButtons
                      editCallback={() =>
                        editFreqFormCallback(
                          frequencyForm,
                          createdFrequencyForms.indexOf(frequencyForm)
                        )
                      }
                      deleteCallback={() =>
                        deleteFreqFormCallback(
                          createdFrequencyForms.indexOf(frequencyForm)
                        )
                      }
                      isEditingFrequency={isEditingFrequency}
                    />
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
};
