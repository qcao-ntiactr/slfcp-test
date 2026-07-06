import { Radio, RadioGroup, Stack } from '@chakra-ui/react';
import { useFormContext } from 'react-hook-form';

import { FieldControlWrapper } from '../../FieldControlWrapper/FieldControlWrapper';

interface BandwidthSubFieldProps {
  fieldName: string;
  isReadOnly?: boolean;
  label: string;
  isTransmittedBandwidth?: boolean;
}
export const BandwidthSubField = ({
  fieldName,
  isReadOnly = false,
  label,
  isTransmittedBandwidth = false,
}: BandwidthSubFieldProps) => {
  const { setValue } = useFormContext();

  return (
    <FieldControlWrapper
      fieldName={fieldName}
      label={label}
      isReadOnly={isReadOnly}
      renderInputChildFn={(field) => (
        <RadioGroup
          id={field?.id || field?.name}
          name={field?.name}
          value={field.value || ''}
          onChange={(val) => setValue(fieldName, val, { shouldValidate: true })}
          w="sm"
        >
          <Stack direction="row" justifyContent="space-evenly">
            <Radio
              value={isTransmittedBandwidth ? 'filtered' : 'before_filtering'}
              className={isReadOnly ? 'read-only-input' : 'input'}
              sx={{
                '&[data-checked]': {
                  bg: 'blue.500',
                  borderColor: 'blue.500',
                  color: 'blue',
                  position: 'relative',
                  _after: {
                    content: '""',
                    width: '60%',
                    height: '60%',
                    borderRadius: '50%',
                    background: 'blue',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  },
                },
              }}
              isReadOnly={isReadOnly}
            >
              {isTransmittedBandwidth
                ? 'Signal is Filtered'
                : 'Before Filtering'}
            </Radio>
            <Radio
              value={
                isTransmittedBandwidth ? 'not_filtered' : 'after_filtering'
              }
              className={isReadOnly ? 'read-only-input' : 'input'}
              isReadOnly={isReadOnly}
              sx={{
                '&[data-checked]': {
                  bg: 'blue.500',
                  borderColor: 'blue.500',
                  color: 'blue',
                  position: 'relative',
                  _after: {
                    content: '""',
                    width: '60%',
                    height: '60%',
                    borderRadius: '50%',
                    background: 'blue',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  },
                },
              }}
            >
              {isTransmittedBandwidth
                ? 'Signal is not Filtered'
                : 'After Filtering'}
            </Radio>
          </Stack>
        </RadioGroup>
      )}
    />
  );
};
