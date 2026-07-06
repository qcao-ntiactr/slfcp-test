import { Input } from '@chakra-ui/react';

import { toLocalFromISO8601 } from '../../RequestForm/Inputs/DateInput/utils/DateInputHelpers';

interface ReadOnlyDateProps {
  id: string;
  value: string;
  type?: 'date' | 'datetime-local';
}

export const ReadOnlyDate = ({
  id,
  value,
  type = 'datetime-local',
}: ReadOnlyDateProps) => {
  const formattedValue = value ? toLocalFromISO8601(value, type) : '';

  return (
    <Input
      id={id}
      isReadOnly
      value={formattedValue}
      type={type}
      className="read-only-input"
      w="sm"
    />
  );
};
