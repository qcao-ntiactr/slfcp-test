import { InputGroup, InputRightAddon } from '@chakra-ui/react';
import { useFormContext } from 'react-hook-form';

import { FieldControlWrapper } from '../../FieldControlWrapper/FieldControlWrapper';
import { NumberInput } from '../../Inputs/NumberInput/NumberInput';

import {
  AntennaAltitudeFieldsProps,
  AntennaAltitudeUnit,
} from './AntennaAltitudeFieldsT';

export const AntennaAltitudeFields = ({
  valueFieldName,
  unitFieldName,
  isReadOnly = false,
  validate,
}: AntennaAltitudeFieldsProps) => {
  const unitOptions: AntennaAltitudeUnit[] = ['ft', 'm', 'km'];

  const { setValue, watch } = useFormContext();

  const currentUnit = watch(unitFieldName, 'ft');

  /**
   * Handles toggling between unit options in a cyclic manner.
   * Updates the form field value to the next unit in the list.
   *
   * @returns {void}
   */
  const handleUnitChange = () => {
    const currentIndex = unitOptions.indexOf(currentUnit);
    const nextUnit =
      currentIndex === unitOptions.length - 1
        ? unitOptions?.[0]
        : unitOptions[currentIndex + 1];
    setValue(unitFieldName, nextUnit);
  };

  return (
    <FieldControlWrapper
      fieldName={valueFieldName}
      label={'Antenna Altitude'}
      validate={validate}
      isReadOnly={isReadOnly}
      renderInputChildFn={(field) => (
        <InputGroup w="sm">
          <NumberInput field={field} isReadOnly={isReadOnly} />
          <InputRightAddon
            id={unitFieldName}
            marginLeft="5px"
            tabIndex={0}
            onClick={isReadOnly ? undefined : handleUnitChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!isReadOnly) handleUnitChange();
              }
            }}
            className={isReadOnly ? 'read-only-addon-button' : 'addon-button'}
            aria-label={`Change the altitude unit. ${currentUnit} is selected.`}
          >
            {currentUnit}
          </InputRightAddon>
        </InputGroup>
      )}
    />
  );
};
