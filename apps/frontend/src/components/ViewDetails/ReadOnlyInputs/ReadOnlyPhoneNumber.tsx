// ReadOnlyPhoneNumberInput.tsx

import { InputGroup, InputLeftAddon, Input, Text } from '@chakra-ui/react';

type ReadOnlyPhoneNumberInput = {
  value: string;
  id: string;
};

export const ReadOnlyPhoneNumber = ({
  value,
  id,
}: ReadOnlyPhoneNumberInput) => {
  return (
    <InputGroup w="sm">
      <InputLeftAddon p="3" backgroundColor="transparent" borderRight="none">
        <Text fontWeight="bold" color="gray.600">
          + 1
        </Text>
      </InputLeftAddon>
      <Input
        id={id}
        value={value}
        type="text"
        isReadOnly
        className="read-only-input"
      />
    </InputGroup>
  );
};
