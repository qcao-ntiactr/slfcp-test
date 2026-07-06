import { FieldError, FieldErrors } from 'react-hook-form';
import { PortalFormDefaults } from '@slfcp/validation';

export type EntityType = 'COMMERCIAL' | 'FEDERAL_AGENCY' | 'NTIA';

export const excludedMessages = [
  'Required',
  'Number Of Frequencies: No frequencies have been added.',
  'Frequencies: Array must contain at least 1 element(s)',
];

export type InvalidField = {
  fieldKey: string;
  fieldName: string;
  message: string;
};

export const getNonRequiredErrors = (
  errors: FieldErrors<PortalFormDefaults>
): InvalidField[] => {
  const invalidFields: InvalidField[] = [];

  Object.entries(errors).forEach(([fieldName, error]) => {
    if (!error) return;

    // Handle nested frequencies errors
    if (fieldName === 'frequencies' && Array.isArray(error)) {
      const hasNestedErrors = error.some((freqError) => {
        if (!freqError) return false;
        return Object.values(freqError).some(
          (err) =>
            (err as FieldError)?.message &&
            !excludedMessages.includes((err as FieldError).message!)
        );
      });

      if (hasNestedErrors) {
        invalidFields.push({
          fieldKey: 'frequencies',
          fieldName: 'Frequencies',
          message: 'See Frequencies tab to correct invalid frequencies',
        });
      }
      return;
    }

    const fieldError = error as FieldError;
    if (fieldError?.message && !excludedMessages.includes(fieldError.message)) {
      const formattedFieldName = fieldName
        .replaceAll('_', ' ')
        .split(' ')
        .map((word) => {
          if (word === 'poc') return 'POC';
          else return word.charAt(0).toUpperCase() + String(word).slice(1);
        })
        .join(' ');

      invalidFields.push({
        fieldKey: fieldName,
        fieldName: formattedFieldName,
        message: (error as FieldError).message as string,
      });
    }
  });

  return invalidFields;
};
