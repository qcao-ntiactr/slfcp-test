import type { requestWizardSteps } from '@slfcp/validation';

import type { InvalidField } from '../utils/Helpers.ts';

import { REQUEST_FORM_STEP_INDEX } from './requestFormSteps.tsx';

export interface VisitedRequestSteps {
  launchSite: boolean;
  frequencies: boolean;
  additionalInformation: boolean;
  summary: boolean;
}

interface GetRequestValidationStateOptions {
  invalidFields: InvalidField[];
  highestVisitedStep: number;
  validation: ReturnType<typeof requestWizardSteps>;
}

const isOwnedByStep = (fieldKey: string, fields: readonly string[]): boolean =>
  fields.includes(fieldKey);

export const getRequestValidationState = ({
  highestVisitedStep,
  invalidFields,
  validation,
}: GetRequestValidationStateOptions) => {
  const visitedSteps: VisitedRequestSteps = {
    launchSite: true,
    frequencies: highestVisitedStep >= REQUEST_FORM_STEP_INDEX.frequencies,
    additionalInformation:
      highestVisitedStep >= REQUEST_FORM_STEP_INDEX.additionalInformation,
    summary: highestVisitedStep >= REQUEST_FORM_STEP_INDEX.summary,
  };

  const isFrequencyField = (fieldKey: string) =>
    isOwnedByStep(fieldKey, validation.frequencies.fields) ||
    fieldKey.startsWith('frequencies');

  const applicableInvalidFields = invalidFields.filter(({ fieldKey }) => {
    if (isOwnedByStep(fieldKey, validation.launchSite.fields)) {
      return visitedSteps.launchSite;
    }
    if (isFrequencyField(fieldKey)) {
      return visitedSteps.frequencies;
    }
    if (isOwnedByStep(fieldKey, validation.additionalInformation.fields)) {
      return visitedSteps.additionalInformation;
    }
    return true;
  });

  return {
    applicableInvalidFields,
    hasInvalidFields: applicableInvalidFields.length > 0,
    hasOnlyFrequencyErrors:
      applicableInvalidFields.length > 0 &&
      applicableInvalidFields.every(({ fieldKey }) =>
        isFrequencyField(fieldKey)
      ),
    visitedSteps,
  };
};
