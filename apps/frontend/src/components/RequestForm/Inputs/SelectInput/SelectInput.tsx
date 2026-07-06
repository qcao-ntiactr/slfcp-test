import { Select } from '@chakra-ui/react';

import { SelectInputProps } from './SelectInputT';

export const SelectInput = ({
  placeholder,
  selectOptions,
  field,
  id,
  isReadOnly = false,
}: SelectInputProps) => {
  const inputId = id || field?.id || field?.name;

  return (
    <Select
      {...field}
      value={field.value || ''}
      id={inputId}
      placeholder={placeholder}
      className={isReadOnly ? 'read-only-input' : 'input'}
      w="sm"
      pointerEvents={isReadOnly ? 'none' : 'initial'}
      aria-readonly={isReadOnly}
      onChange={(event) => {
        const value = event.target.value || undefined;
        field.onChange(value);
      }}
    >
      {selectOptions.map((option) => (
        <option key={`${option.value}-key`} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
};
