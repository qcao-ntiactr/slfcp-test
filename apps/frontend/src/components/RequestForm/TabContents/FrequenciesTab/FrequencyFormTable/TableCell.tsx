import { Td } from '@chakra-ui/react';

export interface TableCellProps {
  data: number | string | undefined;
  isSelectedFreqForm: boolean;
  hasError?: boolean;
}
export const TableCell = ({
  data,
  isSelectedFreqForm,
  hasError,
}: TableCellProps) => {
  return (
    <Td
      textAlign="center"
      color={hasError || !data ? 'red.500' : 'black'}
      fontWeight={isSelectedFreqForm ? 'bold' : 'normal'}
    >
      {data || 'empty'}
    </Td>
  );
};
