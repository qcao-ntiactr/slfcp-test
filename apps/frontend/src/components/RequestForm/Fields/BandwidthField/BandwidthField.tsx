import { Box, Input, InputGroup, InputRightAddon } from '@chakra-ui/react';

import { FieldControlT } from '../../Inputs/TextInput/TextInputT';
import { numberFieldBlurHandler } from '../../Inputs/NumberInput/utils/NumberInputHelpers';
import { FieldControlWrapper } from '../../FieldControlWrapper/FieldControlWrapper';

import { BandwidthSubField } from './BandwidthSubField';

interface FrequencyFieldProps extends FieldControlT {
  includeFilteredField?: boolean;
  isReadOnly?: boolean;
}

export const BandwidthField = ({
  includeFilteredField = true,
  fieldName,
  label,
  isReadOnly = false,
}: FrequencyFieldProps) => {
  const isTransmittedBandwidth = fieldName === 'transmitted_bandwidth';

  return (
    <Box className="field-container">
      <FieldControlWrapper
        fieldName={fieldName}
        label={label}
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
              MHz
            </InputRightAddon>
          </InputGroup>
        )}
      />

      {includeFilteredField && (
        <BandwidthSubField
          fieldName={
            isTransmittedBandwidth
              ? `${fieldName}_is_signal_filtered`
              : `${fieldName}_before_or_after_filtering`
          }
          label={
            isTransmittedBandwidth ? 'Is Signal Filtered?' : `${label} Filter`
          }
          isTransmittedBandwidth={isTransmittedBandwidth}
          isReadOnly={isReadOnly}
        />
      )}
    </Box>
  );
};
