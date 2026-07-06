/**
 * Converts an ISO 8601 string (UTC) to a local date or datetime string.
 *
 * @param {string} isoString - The ISO 8601 formatted date string in UTC.
 * @param {'date' | 'datetime-local'} type - The expected output format.
 * @returns {string} - The formatted local date or datetime string.
 */
export const toLocalFromISO8601 = (
  isoString: string,
  type: 'date' | 'datetime-local'
) => {
  if (!isoString) return '';

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  if (type === 'date') {
    // Return only YYYY-MM-DD for date inputs
    return date.toISOString().split('T')[0];
  } else {
    // Convert to local time in 'YYYY-MM-DDTHH:mm' format
    return date
      .toLocaleString('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      .replace(',', '')
      .replace(/\//g, '-')
      .replace(' ', 'T');
  }
};

/**
 * Converts a local date/datetime string to an ISO 8601 formatted string (UTC).
 *
 * @param {string} dateString - The local date or datetime string to be converted.
 * @returns {string | undefined} - The ISO 8601 formatted string in UTC or undefined if the input is empty/invalid.
 */
export const toISO8601FromLocal = (dateString: string) => {
  if (!dateString) return;

  const isDateOnly = dateString.length === 10; // YYYY-MM-DD (length 10)

  if (isDateOnly) {
    // Handle date-only format (ensures midnight UTC)
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) return;

    return new Date(Date.UTC(year, month - 1, day)).toISOString();
  } else {
    // Handle datetime-local format (YYYY-MM-DDTHH:mm)
    const localDate = new Date(dateString);
    if (isNaN(localDate.getTime())) return;

    return localDate.toISOString();
  }
};

/**
 * Determines the name of the date field whose validation is based on the validation of the given field name.
 * Converts "_start" to "_end" and vice versa.
 *
 * @param {string} fieldName - The base field name to process.
 * @returns {string[]} - The corresponding dependent field names.
 */
export const getDependentDateFieldName = (fieldName: string) => {
  let dependentFieldNames = [];

  // Handle receiver fields (receivers.X.field_name)
  const receiverMatch = fieldName.match(/^receivers\.(\d+)\.(.+)$/);
  if (receiverMatch) {
    const receiverIndex = receiverMatch[1];
    const fieldPart = receiverMatch[2];

    // Replace _start with _end and vice versa for the same receiver
    if (fieldPart.endsWith('_start')) {
      dependentFieldNames.push(
        `receivers.${receiverIndex}.${fieldPart.replace(/_start$/, '_end')}`
      );
    } else if (fieldPart.endsWith('_end')) {
      dependentFieldNames.push(
        `receivers.${receiverIndex}.${fieldPart.replace(/_end$/, '_start')}`
      );
    }

    // Add tx transmission dependencies for receiver fields
    dependentFieldNames.push('tx_transmission_start', 'tx_transmission_end');
  } else {
    // Handle non-receiver fields
    if (fieldName.endsWith('_start')) {
      dependentFieldNames.push(fieldName.replace(/_start$/, '_end'));
    } else if (fieldName.endsWith('_end')) {
      dependentFieldNames.push(fieldName.replace(/_end$/, '_start'));
    }

    // Add receiver dependencies for tx fields
    if (fieldName.startsWith('tx')) {
      dependentFieldNames.push(
        'receivers.0.transmission_start',
        'receivers.0.transmission_end'
      );
    }
  }

  return dependentFieldNames;
};
