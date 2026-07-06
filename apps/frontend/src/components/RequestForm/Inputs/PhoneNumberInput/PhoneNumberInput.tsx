import { Input, InputGroup, InputLeftAddon, Text } from '@chakra-ui/react';

import { TextInputProps } from '../TextInput/TextInputT';

import { applyPhoneNumberMask } from './utils/PhoneNumberInputHelpers';

export const PhoneNumberInput = ({
  field,
  id,
  isReadOnly = false,
}: TextInputProps) => {
  const inputId = id || field?.id || field?.name;

  return (
    <InputGroup w="sm">
      <InputLeftAddon p="3" backgroundColor="transparent" borderRight="none">
        <Text fontWeight="bold">+ 1</Text>
      </InputLeftAddon>
      <Input
        id={inputId}
        className={isReadOnly ? 'read-only-input' : 'input'}
        type="text"
        value={field?.value ? applyPhoneNumberMask(field?.value) : ''}
        isReadOnly={isReadOnly}
        onChange={(e) => {
          let formattedValue = e.target?.value
            ?.replace(/\D/g, '')
            .slice(0, 10)
            .replace(/^(\d{3})(\d{0,3})(\d{0,4})$/, (_, p1, p2, p3) =>
              [p1, p2, p3].filter(Boolean).join('-')
            );

          field.onChange(formattedValue);
        }}
        onKeyDown={(e) => {
          const allowedKeys = [
            'Backspace',
            'ArrowLeft',
            'ArrowRight',
            'Tab',
            'Delete',
            'Enter',
          ];
          if (!/^[0-9]$/.test(e.key) && !allowedKeys.includes(e.key)) {
            e.preventDefault(); // Block invalid key presses
          }
        }}
      />
    </InputGroup>
  );
};
