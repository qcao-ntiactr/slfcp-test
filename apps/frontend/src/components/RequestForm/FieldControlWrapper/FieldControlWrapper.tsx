import {
  Box,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
} from '@chakra-ui/react';
import { ReactElement } from 'react';
import {
  Controller,
  ControllerRenderProps,
  get,
  useFormContext,
} from 'react-hook-form';

import { FieldControlT } from '../Inputs/TextInput/TextInputT';

interface FieldControlWrapperProps extends FieldControlT {
  renderInputChildFn: (
    _field: ControllerRenderProps & { id?: string }
  ) => ReactElement;

  validate?: (
    _value: unknown,
    _formValues: Record<string, unknown>
  ) => string | boolean;

  isReadOnly?: boolean;
}

export const FieldControlWrapper = ({
  fieldName,
  label,
  renderInputChildFn,
  validate,
  isReadOnly = false,
}: FieldControlWrapperProps) => {
  const {
    control,
    formState: { errors },
    getValues,
    trigger,
  } = useFormContext();

  const id = isReadOnly ? `${fieldName}_readonly` : fieldName;

  const error = get(errors, fieldName);

  return (
    <Box className="field-container">
      <FormControl isInvalid={!!error}>
        <Flex className="field-row">
          <Box maxHeight="xs" p={0} overflow="hidden">
            <FormLabel htmlFor={id} className="field-label">
              {label}
            </FormLabel>
            <FormErrorMessage className="field-error" color="red.600" pr={5}>
              {error?.message}
            </FormErrorMessage>
          </Box>
          <Controller
            key={fieldName}
            name={fieldName}
            control={control}
            rules={{
              validate: validate
                ? (value) => validate(value, getValues())
                : undefined,
            }}
            render={({ field }) =>
              renderInputChildFn({
                ...field,
                id,
                onChange: (e) => {
                  field.onChange(e); // Dynamic validation triggering based on field type
                  if (fieldName.startsWith('receivers.')) {
                    setTimeout(() => {
                      // Get current form values to determine how many receivers exist
                      const formValues = getValues();
                      const receivers = formValues.receivers || [];

                      // Build list of fields to trigger validation for
                      const fieldsToTrigger = [
                        'tx_transmission_start',
                        'tx_transmission_end',
                      ];

                      // Add all receiver fields dynamically
                      receivers.forEach((_: unknown, index: number) => {
                        fieldsToTrigger.push(
                          `receivers.${index}.transmission_start`,
                          `receivers.${index}.transmission_end`,
                          `receivers.${index}.antenna_type`,
                          `receivers.${index}.antenna_gain`,
                          `receivers.${index}.antenna_beamwidth`,
                          `receivers.${index}.antenna_altitude`,
                          `receivers.${index}.location_of_receiving_ground_station`,
                          `receivers.${index}.longitude_of_receiving_antenna`,
                          `receivers.${index}.latitude_of_receiving_antenna`
                        );
                      });

                      trigger(fieldsToTrigger);
                    }, 0);
                  }

                  // If this is a transmitter date field, trigger validation on all receiver dates
                  if (fieldName.startsWith('tx_transmission_')) {
                    setTimeout(() => {
                      const formValues = getValues();
                      const receivers = formValues.receivers || [];

                      const dateFieldsToTrigger: string[] = [];
                      receivers.forEach((_: unknown, index: number) => {
                        dateFieldsToTrigger.push(
                          `receivers.${index}.transmission_start`,
                          `receivers.${index}.transmission_end`
                        );
                      });

                      trigger(dateFieldsToTrigger);
                    }, 0);
                  }
                },
              })
            }
          />
        </Flex>
      </FormControl>
    </Box>
  );
};
