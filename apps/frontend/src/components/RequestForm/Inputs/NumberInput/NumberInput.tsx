import { Input } from '@chakra-ui/react';

import { TextInputProps } from '../TextInput/TextInputT';

import { numberFieldBlurHandler } from './utils/NumberInputHelpers';
export interface NumberInputProps extends TextInputProps {
  isWholeNumber?: boolean;
}

export const NumberInput = ({
  field,
  id,
  placeholder,
  isReadOnly = false,
  isWholeNumber = false,
}: NumberInputProps) => {
  const inputId = id || field?.id || field?.name;

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
      onChange={(e) => field.onChange(e.target.value)}
      onBlur={() => numberFieldBlurHandler(field.value, field)}
    />
  );
};
