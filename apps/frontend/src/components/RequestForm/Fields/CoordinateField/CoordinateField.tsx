import {
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightAddon,
} from '@chakra-ui/react';
import { useFormContext } from 'react-hook-form';
import React, { useState, useMemo } from 'react';

import { FieldControlWrapper } from '../../FieldControlWrapper/FieldControlWrapper';

import { normalizeCoordValue } from './utils/CoordinateHelpers';
import {
  CoordinateFieldProps,
  Direction,
  DirectionOptions,
} from './CoordinateFieldT';

export const CoordinateField = ({
  label,
  fieldName,
  mode,
  isReadOnly = false,
  validate,
}: CoordinateFieldProps) => {
  const { setValue, watch, clearErrors, trigger } = useFormContext();
  const currentVal = watch(fieldName);

  const directionOptions: DirectionOptions = useMemo(() => {
    if (mode === 'latitude')
      return { positive: Direction.North, negative: Direction.South };
    if (mode === 'longitude')
      return { positive: Direction.East, negative: Direction.West };

    console.error(`Invalid mode provided to CoordinateField: ${mode}`);
    return { positive: Direction.North, negative: Direction.South }; // Fallback to avoid crashes
  }, [mode]);

  // Default to N and W, respective to latitude or longitude
  const initialDirection =
    mode === 'latitude' ? directionOptions.positive : directionOptions.negative;

  const [lastDirection, setLastDirection] = useState(initialDirection);

  // Compute current direction based on field value
  const currentDirection = useMemo(() => {
    if (!currentVal || isNaN(currentVal)) return lastDirection;

    const newDirection =
      parseFloat(currentVal) < 0
        ? directionOptions.negative
        : directionOptions.positive;

    if (newDirection !== lastDirection) {
      setLastDirection(newDirection);
    }

    return newDirection;
  }, [currentVal, directionOptions, lastDirection]);

  /**
   * Handles toggling between direction options and updates the field value accordingly.
   */
  const handleDirectionChange = () => {
    const newDirection =
      lastDirection === directionOptions.positive
        ? directionOptions.negative
        : directionOptions.positive;

    setLastDirection(newDirection);

    if (!currentVal || isNaN(parseFloat(currentVal))) {
      setValue(fieldName, undefined);
    } else {
      setValue(fieldName, parseFloat(currentVal) * -1);
    }

    clearErrors(fieldName);
    trigger(fieldName);
  };

  return (
    <FieldControlWrapper
      fieldName={fieldName}
      label={label}
      validate={validate}
      isReadOnly={isReadOnly}
      renderInputChildFn={(field) => (
        <InputGroup w="sm">
          <InputLeftAddon
            className={isReadOnly ? 'read-only-addon-button' : 'addon-button'}
            marginRight="5px"
            onClick={isReadOnly ? undefined : handleDirectionChange}
            role="button"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!isReadOnly) handleDirectionChange();
              }
            }}
            tabIndex={0}
            aria-label={`Toggle between ${directionOptions.positive} and ${directionOptions.negative}. ${currentDirection} is selected.`}
          >
            {currentDirection}
          </InputLeftAddon>
          <Input
            name={field?.name}
            className={isReadOnly ? 'read-only-input' : 'input'}
            sx={{
              borderTopLeftRadius: '5px',
              borderBottomLeftRadius: '5px',
            }}
            isReadOnly={isReadOnly}
            id={field?.id || fieldName}
            value={normalizeCoordValue(field.value)}
            type="number"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              let rawValue = e.target.value;

              // Allow empty input (for deletion)
              if (rawValue === '') {
                field.onChange(undefined);
                return;
              }

              let parsedValue = parseFloat(rawValue);
              if (isNaN(parsedValue)) {
                field.onChange(undefined);
                trigger(fieldName);
                return;
              }

              if (currentDirection === directionOptions.negative) {
                parsedValue *= -1;
              }

              field.onChange(parsedValue);
            }}
            onKeyDown={(e) => {
              if (e.code === 'NumpadSubtract' || e.code === 'Minus') {
                e.preventDefault();
              }
            }}
          />
          <InputRightAddon className="addon-label" color="gray.700">
            DD
          </InputRightAddon>
        </InputGroup>
      )}
    />
  );
};
