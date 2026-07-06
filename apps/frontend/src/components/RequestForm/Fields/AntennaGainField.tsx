import { Box, Input, InputGroup, InputRightAddon } from '@chakra-ui/react';

import { FieldControlT } from '../Inputs/TextInput/TextInputT';
import { numberFieldBlurHandler } from '../Inputs/NumberInput/utils/NumberInputHelpers';
import { FieldControlWrapper } from '../FieldControlWrapper/FieldControlWrapper';

interface AntennaGainFieldProps extends FieldControlT {
  isReadOnly?: boolean;
  validate?: (
    _value: unknown,
    _formValues: Record<string, unknown>
  ) => string | boolean;
}

export const AntennaGainField = ({
  fieldName,
  label,
  isReadOnly = false,
  validate,
}: AntennaGainFieldProps) => {
  return (
    <Box className="field-container">
      <FieldControlWrapper
        fieldName={fieldName}
        label={label}
        validate={validate}
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <InputGroup w="sm">
            <Input
              id={field?.id || field?.name}
              name={field?.name}
              className={isReadOnly ? 'read-only-input' : 'input'}
              value={field.value ? String(field.value) : ''}
              type="number"
              isReadOnly={isReadOnly}
              backgroundColor="white"
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={() => numberFieldBlurHandler(field.value, field)}
            />
            <InputRightAddon bg="white" color="gray.600">
              dBi
            </InputRightAddon>
          </InputGroup>
        )}
      />
    </Box>
  );
};
