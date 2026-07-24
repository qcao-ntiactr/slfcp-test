import { requestWizardSteps } from '@slfcp/validation';

import type { VisitedRequestSteps } from '../FormContainer/requestValidationState.ts';
import type { InvalidField } from '../utils/Helpers.ts';

const requestStepValidation = requestWizardSteps();

const findErrorsForFields = (
  invalidFields: InvalidField[],
  fields: readonly string[]
) =>
  fields
    .map((fieldKey) =>
      invalidFields.find((field) => field.fieldKey === fieldKey)
    )
    .filter((field): field is InvalidField => field !== undefined);

interface InvalidFieldSection {
  id: keyof VisitedRequestSteps;
  label: string;
  errors: InvalidField[];
  summary?: string;
}

export const buildInvalidFieldSections = (
  invalidFields: InvalidField[],
  visitedSteps: VisitedRequestSteps
): InvalidFieldSection[] => {
  const sections: InvalidFieldSection[] = [
    {
      id: 'launchSite',
      label: 'Launch Site',
      errors: findErrorsForFields(
        invalidFields,
        requestStepValidation.launchSite.fields
      ),
    },
    {
      id: 'frequencies',
      label: 'Frequencies',
      errors: invalidFields.filter(
        ({ fieldKey }) =>
          (
            requestStepValidation.frequencies.fields as readonly string[]
          ).includes(fieldKey) || fieldKey.startsWith('frequencies')
      ),
      summary: 'See Frequencies tab to correct invalid frequencies',
    },
    {
      id: 'additionalInformation',
      label: 'Additional Information',
      errors: findErrorsForFields(
        invalidFields,
        requestStepValidation.additionalInformation.fields
      ),
    },
  ];

  return sections.filter(
    ({ id, errors }) => visitedSteps[id] && errors.length > 0
  );
};
