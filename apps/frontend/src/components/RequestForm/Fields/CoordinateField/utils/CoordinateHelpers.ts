import { CoordinateTypeT } from 'apps/frontend/src/components/ViewDetails/ReadOnlyInputs';

/**
 * Formats coordinate values for display in an input component.
 * Ensures the displayed value is always positive, while sign adjustments are handled separately.
 *
 * @param {string} coordValue - The coordinate value from the form state.
 * @returns {string} - The absolute value of the coordinate formatted as a string.
 */
export const normalizeCoordValue = (coordValue: string) => {
  const parsedVal = parseFloat(coordValue);
  if (parsedVal < 0) {
    return String(parsedVal * -1);
  } else if (!isNaN(parsedVal)) {
    return coordValue;
  } else {
    return '';
  }
};

export const getDirection = (
  coordinateType: CoordinateTypeT,
  value: number
): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '';
  }

  if (coordinateType === 'latitude') {
    return value < 0 ? 'S' : 'N';
  } else if (coordinateType === 'longitude') {
    return value < 0 ? 'W' : 'E';
  }

  return '';
};
