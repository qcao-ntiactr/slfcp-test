import { Box, Input, InputGroup, InputRightAddon } from '@chakra-ui/react';
import { useFormContext } from 'react-hook-form';

import { numberFieldBlurHandler } from '../../Inputs/NumberInput/utils/NumberInputHelpers';
import { FieldControlWrapper } from '../../FieldControlWrapper/FieldControlWrapper';
import { BandwidthSubField } from '../BandwidthField/BandwidthSubField';

interface TransmittedBandwidthFieldProps {
  isReadOnly?: boolean;
}

export const TransmittedBandwidthField = ({
  isReadOnly = false,
}: TransmittedBandwidthFieldProps) => {
  const { clearErrors, trigger } = useFormContext();

  return (
    <Box className="field-container">
      <FieldControlWrapper
        fieldName={'transmitted_bandwidth'}
        label={'Transmitted Bandwidth'}
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
              onChange={(e) => {
                clearErrors(['transmitted_bandwidth', 'frequency']);
                field.onChange(e.target.value);
                trigger(['transmitted_bandwidth', 'frequency']);
              }}
              onBlur={() => numberFieldBlurHandler(field.value, field)}
            />
            <InputRightAddon bg="white" color="gray.600">
              MHz
            </InputRightAddon>
          </InputGroup>
        )}
      />

      <BandwidthSubField
        fieldName={`transmitted_bandwidth_is_signal_filtered`}
        label={'Is Signal Filtered?'}
        isTransmittedBandwidth={true}
        isReadOnly={isReadOnly}
      />
    </Box>
  );
};
