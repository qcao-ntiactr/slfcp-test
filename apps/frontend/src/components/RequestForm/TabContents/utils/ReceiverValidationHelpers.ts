interface ReceiverData {
  transmission_start?: string;
  transmission_end?: string;
  antenna_type?: string;
  antenna_gain?: number;
  antenna_beamwidth?: number;
  antenna_altitude?: number;
  antenna_altitude_unit?: string;
  location_of_receiving_ground_station?: string;
  longitude_of_receiving_antenna?: number;
  latitude_of_receiving_antenna?: number;
}

// Type for form values structure
interface FormValues {
  receivers?: ReceiverData[];
  [key: string]: unknown;
}

/**
 * Checks if a receiver (other than the first one) has any meaningful values.
 * Ignores default unit values and empty/null/undefined values.
 *
 * @param {ReceiverData | undefined} receiver - The receiver object to check.
 * @returns {boolean} - True if the receiver has meaningful values, false otherwise.
 */
export const receiverHasValues = (
  receiver: ReceiverData | undefined
): boolean => {
  if (!receiver) return false;

  return Object.entries(receiver).some(([key, value]) => {
    if (key === 'antenna_altitude_unit') return false; // Skip default unit value
    if (value === undefined || value === null || value === '') return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    return true;
  });
};

/**
 * Extracts receiver index from field name.
 *
 * @param {string} fieldName - The field name (e.g., "receivers.1.antenna_type").
 * @returns {number | null} - The receiver index or null if not found.
 */
export const getReceiverIndexFromFieldName = (
  fieldName: string
): number | null => {
  const match = fieldName.match(/^receivers\.(\d+)\./);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Validation function for optional receiver fields (any receiver except the first one).
 * If a receiver has any values, all its fields become required.
 *
 * @param {string} fieldName - The field name to validate.
 * @returns {Function} - Validation function that returns string (error) or boolean (valid).
 */
export const validateOptionalReceiverField = (fieldName: string) => {
  return (value: unknown, formValues: FormValues): string | boolean => {
    const receiverIndex = getReceiverIndexFromFieldName(fieldName);

    // If this is the first receiver (index 0), it's always required - let Zod handle it
    if (receiverIndex === null || receiverIndex === 0) {
      return true;
    }

    // For other receivers, check if the receiver has any values
    const receiver = formValues.receivers?.[receiverIndex];
    const hasValues = receiverHasValues(receiver);

    if (hasValues) {
      // If receiver has any values, this field becomes required
      if (value === undefined || value === null || value === '') {
        return 'Required.';
      }
      if (typeof value === 'string' && value.trim() === '') {
        return 'Required.';
      }
    }

    return true;
  };
};
