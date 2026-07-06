import { Select } from '@chakra-ui/react';

interface ReadOnlySelectProps {
  id: string;
  value?: string;
  options: { value: string; label: string }[];
}

export const ReadOnlySelect = ({ id, value, options }: ReadOnlySelectProps) => {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Select
      id={id}
      value={selectedOption?.value || ''}
      isDisabled
      className="read-only-input"
      w="sm"
      iconColor="gray.500"
      _disabled={{
        opacity: 1,
        bg: 'white',
        color: 'inherit',
        cursor: 'default',
      }}
    >
      {selectedOption ? (
        <option value={selectedOption.value}>{selectedOption.label}</option>
      ) : (
        <option value="">—</option>
      )}
    </Select>
  );
};
