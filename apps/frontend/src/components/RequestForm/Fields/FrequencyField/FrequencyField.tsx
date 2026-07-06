import { Input } from '@chakra-ui/react';
import { useFormContext } from 'react-hook-form';

import { NumberInputProps } from '../../Inputs/NumberInput/NumberInput';
import { numberFieldBlurHandler } from '../../Inputs/NumberInput/utils/NumberInputHelpers';

export const FrequencyField = ({
  field,
  placeholder,
  isReadOnly = false,
  isWholeNumber = false,
}: NumberInputProps) => {
  const { clearErrors, trigger } = useFormContext();
  const inputId = field?.id || field?.name;

  return (
    <Input
      w="sm"
      id={inputId}
      step={isWholeNumber ? 1 : undefined}
      onKeyDown={
        isWholeNumber
          ? (e) => {
              if (e.key === '.' || e.key === ',') {
                e.preventDefault();
              }
            }
          : undefined
      }
      className={isReadOnly ? 'read-only-input' : 'input'}
      isReadOnly={isReadOnly}
      value={field.value !== undefined ? String(field.value) : ''}
      placeholder={placeholder}
      type="number"
      onChange={(e) => {
        clearErrors(['frequency', 'transmitted_bandwidth']);
        field.onChange(e.target.value);
        trigger(['frequency', 'transmitted_bandwidth']);
      }}
      onBlur={() => numberFieldBlurHandler(field.value, field)}
    />
  );
};
