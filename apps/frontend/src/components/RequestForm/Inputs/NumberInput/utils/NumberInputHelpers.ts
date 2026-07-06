import { ControllerRenderProps, FieldValues } from 'react-hook-form';

/**
 * Handles changes in a number input field onBlur, converting the value to a float.
 * If the value is not a valid number or empty, it is cleared.
 *
 * @param {string} value - The raw value as a string.
 * @param {ControllerRenderProps<FieldValues, string>} fieldControl - The field control object from react-hook-form.
 */
export const numberFieldBlurHandler = (
  value: string,
  fieldControl: ControllerRenderProps<FieldValues, string>
) => {
  if (value === '') {
    fieldControl.onChange(undefined);
    return;
  }

  const parsedValue = parseFloat(value);
  fieldControl.onChange(isNaN(parsedValue) ? undefined : parsedValue);
};
