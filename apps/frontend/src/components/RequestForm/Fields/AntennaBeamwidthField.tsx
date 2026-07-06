import { InputGroup, InputRightAddon } from '@chakra-ui/react';

import { FieldControlWrapper } from '../FieldControlWrapper/FieldControlWrapper';
import { NumberInput } from '../Inputs/NumberInput/NumberInput';

interface AntennaBeamwidthFieldProps {
  fieldName: string;
  label: string;
  isReadOnly?: boolean;
  validate?: (
    // eslint-disable-next-line no-unused-vars
    value: unknown,
    // eslint-disable-next-line no-unused-vars
    formValues: Record<string, unknown>
  ) => string | boolean;
}

export const AntennaBeamwidthField = ({
  fieldName,
  label,
  isReadOnly = false,
  validate,
}: AntennaBeamwidthFieldProps) => {
  return (
    <FieldControlWrapper
      fieldName={fieldName}
      label={label}
      validate={validate}
      isReadOnly={isReadOnly}
      renderInputChildFn={(field) => (
        <InputGroup w="sm">
          <NumberInput field={field} isReadOnly={isReadOnly} />
          <InputRightAddon bg="white" color="gray.600">
            degrees
          </InputRightAddon>
        </InputGroup>
      )}
    />
  );
};
